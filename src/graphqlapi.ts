import { CfnGraphQLApi, CfnApiKey, CfnGraphQLSchema } from '@aws-cdk/aws-appsync'
import { Construct, Resource } from '@aws-cdk/core'
import { Role, ServicePrincipal, ManagedPolicy } from '@aws-cdk/aws-iam'

export const enum FieldLogLevel {
  NONE = 'NONE',
  ERROR = 'ERROR',
  ALL = 'ALL',
}

export const enum AuthenticationType {
  API_KEY = 'API_KEY',
  AWS_IAM = 'AWS_IAM',
  AMAZON_COGNITO_USER_POOLS = 'AMAZON_COGNITO_USER_POOLS',
  OPENID_CONNECT = 'OPENID_CONNECT',
}

export abstract class AuthenticationProviderProps {
  public readonly authenticationType: AuthenticationType
  constructor(authicationType: AuthenticationType) {
    this.authenticationType = authicationType
  }
}

export class ApiKeyProviderProps extends AuthenticationProviderProps {
  constructor() {
    super(AuthenticationType.API_KEY)
  }
}

export class IAMProviderProps extends AuthenticationProviderProps {
  constructor() {
    super(AuthenticationType.AWS_IAM)
  }
}

export interface OIDCProviderConfig {
  issuer: string
  authTTL?: number
  clientId?: string
  iatTTL?: number
}

export class OIDCProviderProps extends AuthenticationProviderProps {
  public readonly config: OIDCProviderConfig
  constructor(config: OIDCProviderConfig) {
    super(AuthenticationType.OPENID_CONNECT)
    this.config = config
  }
}

export interface LogConfig {
  excludeVerboseContent: boolean
  fieldLogLevel: FieldLogLevel
}

export interface GraphQLApiProps {
  name: string
  defaultAuthentication: AuthenticationProviderProps
  schema: string
  logConfig?: LogConfig
}

export interface IGraphQLApi {
  readonly apiId: string
  readonly schema: string
  readonly url: string
}

const authenticationToCfn = (
  props: AuthenticationProviderProps
): CfnGraphQLApi.AdditionalAuthenticationProviderProperty => {
  let openIdConnectConfig
  if (props instanceof OIDCProviderProps) {
    openIdConnectConfig = props.config
  }

  return {
    authenticationType: props.authenticationType,
    openIdConnectConfig,
  }
}

export interface ApiKeyProps {
  scope: Construct
  id?: string
  description?: string
  expires?: number
}

export interface ApiKey {
  readonly api: IGraphQLApi
  readonly key: string
  readonly arn: string
  readonly description?: string
  readonly expires?: number
}

export class GraphQLApi extends Resource implements IGraphQLApi {
  public readonly apiId: string
  public readonly schema: string
  public readonly url: string
  constructor(scope: Construct, id: string, props: GraphQLApiProps) {
    super(scope, id)
    const { name, defaultAuthentication, schema } = props
    this.schema = schema

    const logProps = props.logConfig || {
      excludeVerboseContent: false,
      fieldLogLevel: FieldLogLevel.ALL,
    }
    const role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSAppSyncPushToCloudWatchLogs'),
      ],
    })
    const logConfig = { ...logProps, cloudWatchLogsRoleArn: role.roleArn }

    const cfnAuthenticationProps = authenticationToCfn(defaultAuthentication)
    const cfn_graphqlApi = new CfnGraphQLApi(scope, `Resource`, {
      name,
      logConfig,
      ...cfnAuthenticationProps,
    })
    this.apiId = cfn_graphqlApi.attrApiId
    this.url = cfn_graphqlApi.attrGraphQlUrl

    new CfnGraphQLSchema(scope, `Schema`, {
      apiId: this.apiId,
      definition: schema,
    })
  }

  createApiKey(scope: Construct, props: ApiKeyProps): ApiKey {
    const id = props.id || 'ApiKey'
    const resource = new CfnApiKey(scope, id, {
      apiId: this.apiId,
      description: props.description,
      expires: props.expires,
    })
    return {
      api: this,
      key: resource.attrApiKey,
      arn: resource.attrArn,
      description: resource.description,
      expires: resource.expires,
    }
  }
}

import { CfnGraphQLApi, CfnApiKey, CfnGraphQLSchema } from '@aws-cdk/aws-appsync'
import { Construct, Resource } from '@aws-cdk/core'
import { Role, ServicePrincipal, ManagedPolicy } from '@aws-cdk/aws-iam'

export const enum FieldLogLevel {
  NONE = 'NONE',
  ERROR = 'ERROR',
  ALL = 'ALL',
}

export interface LogConfig {
  excludeVerboseContent: boolean
  fieldLogLevel: FieldLogLevel
}

export interface GraphQLApiProps {
  name: string
  authenticationType: string
  schema: string
  logConfig?: LogConfig
}

export interface IGraphQLApi {
  apiId: string
}

export class GraphQLApi extends Resource implements IGraphQLApi {
  public readonly apiId: string
  public readonly schema: string
  constructor(scope: Construct, id: string, props: GraphQLApiProps) {
    super(scope, id)
    const { name, authenticationType, schema } = props
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

    const cfn_graphqlApi = new CfnGraphQLApi(scope, `Resource`, {
      name,
      authenticationType,
      logConfig,
    })
    this.apiId = cfn_graphqlApi.attrApiId

    new CfnApiKey(scope, 'ApiKey', {
      apiId: this.apiId,
    })

    new CfnGraphQLSchema(scope, `Schema`, {
      apiId: this.apiId,
      definition: schema,
    })
  }

  static fromApiId(apiId: string): IGraphQLApi {
    return { apiId }
  }
}

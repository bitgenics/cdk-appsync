import { CfnGraphQLApi, CfnApiKey, CfnGraphQLSchema } from '@aws-cdk/aws-appsync'
import { Construct, Resource } from '@aws-cdk/core'

export interface GraphQLApiProps {
  name: string
  authenticationType: string
  schema: string
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

    const cfn_graphqlApi = new CfnGraphQLApi(scope, `Resource`, {
      name,
      authenticationType,
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

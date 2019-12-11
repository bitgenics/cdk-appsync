import { CfnGraphQLApi, CfnApiKey, CfnGraphQLSchema } from '@aws-cdk/aws-appsync'
import { Construct } from '@aws-cdk/core'

export interface GraphQLApiProps {
  name: string
  authenticationType: string
  schema: string
}

export class GraphQLApi extends Construct {
  apiId: string
  schema: string
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
}

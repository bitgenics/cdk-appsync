import { Arn, Construct, Resource } from '@aws-cdk/core'
import { CfnDataSource, CfnResolver } from '@aws-cdk/aws-appsync'
import { Table } from '@aws-cdk/aws-dynamodb'
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam'
import { Resolver } from './resolver'
import { IGraphQLApi } from './graphqlapi'

export const enum DynamoDBDataSourcePermission {
  Read = 1,
  Write,
  ReadWrite,
}

export interface DynamoDBDataSourceProps {
  api: IGraphQLApi
  table: Table
  name?: string
  permission?: DynamoDBDataSourcePermission
}

export class DynamoDBDataSource extends Resource {
  public readonly api: IGraphQLApi
  public readonly name: string
  public readonly table: Table
  public readonly permission: DynamoDBDataSourcePermission
  private resource: CfnDataSource
  constructor(scope: Construct, id: string, props: DynamoDBDataSourceProps) {
    super(scope, id)

    this.api = props.api
    this.table = props.table
    this.permission = props.permission || DynamoDBDataSourcePermission.ReadWrite
    this.name = props.name || `${this.table.tableName}DataSource`

    const role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
    })

    switch (this.permission) {
      case DynamoDBDataSourcePermission.Read:
        this.table.grantReadData(role)
      case DynamoDBDataSourcePermission.Write:
        this.table.grantWriteData(role)
      case DynamoDBDataSourcePermission.ReadWrite:
        this.table.grantReadWriteData(role)
    }

    const region = Arn.parse(this.table.tableArn).region

    this.resource = new CfnDataSource(this, 'Resource', {
      apiId: this.api.apiId,
      name: this.name,
      type: 'AMAZON_DYNAMODB',
      dynamoDbConfig: {
        tableName: this.table.tableName,
        awsRegion: region!,
      },
      serviceRoleArn: role.roleArn,
    })
  }

  public addResolver(resolver: Resolver) {
    const { typeName, fieldName } = resolver
    const name = `${typeName}${fieldName}Resolver`
    const cfn_resolver = new CfnResolver(this, name, {
      apiId: this.api.apiId,
      typeName,
      fieldName,
      dataSourceName: this.name,
      requestMappingTemplate: resolver.requestMappingTemplate,
      responseMappingTemplate: resolver.responseMappingTemplate,
    })
    cfn_resolver.addDependsOn(this.resource)
  }
}

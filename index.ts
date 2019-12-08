import { Arn, Construct } from '@aws-cdk/core'
import { CfnDataSource, CfnResolver } from '@aws-cdk/aws-appsync'
import { Table } from '@aws-cdk/aws-dynamodb'
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam'

export interface ResolverProps {
  typeName: string
  fieldName: string
  requestMappingTemplate: string
  responseMappingTemplate?: string
}

export class Resolver {
  typeName: string
  fieldName: string
  requestMappingTemplate: string
  responseMappingTemplate: string
  constructor(props: ResolverProps) {
    this.typeName = props.typeName
    this.fieldName = props.fieldName
    this.requestMappingTemplate = props.requestMappingTemplate
    this.responseMappingTemplate = props.responseMappingTemplate || `$util.toJson($ctx.result)`
  }
}

export const enum DynamoDBDataSourcePermission {
  Read = 1,
  Write,
  ReadWrite,
}

export interface DynamoDBDataSourceProps {
  apiId: string
  table: Table
  name?: string
  permission?: DynamoDBDataSourcePermission
}

export class DynamoDBDataSource extends Construct {
  apiId: string
  name: string
  table: Table
  permission: DynamoDBDataSourcePermission
  resource: CfnDataSource
  constructor(scope: Construct, id: string, props: DynamoDBDataSourceProps) {
    super(scope, id)

    this.apiId = props.apiId
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
      apiId: this.apiId,
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
      apiId: this.apiId,
      typeName,
      fieldName,
      dataSourceName: this.name,
      requestMappingTemplate: resolver.requestMappingTemplate,
      responseMappingTemplate: resolver.responseMappingTemplate,
    })
    cfn_resolver.addDependsOn(this.resource)
  }
}

import { Arn, Construct, Resource, IResource } from '@aws-cdk/core'
import { CfnDataSource } from '@aws-cdk/aws-appsync'
import { Table } from '@aws-cdk/aws-dynamodb'
import { Role, ServicePrincipal } from '@aws-cdk/aws-iam'
import { Function } from '@aws-cdk/aws-lambda'

import { IGraphQLApi } from './graphqlapi'

export const enum DynamoDBDataSourcePermission {
  Read = 1,
  Write,
  ReadWrite,
}

interface DataSourceProps {
  readonly api: IGraphQLApi
  readonly description?: string
  readonly name?: string
}

export const enum DataSourceType {
  AMAZON_DYNAMODB = 'AMAZON_DYNAMODB',
  AMAZON_ELASTICSEARCH = 'AMAZON_ELASTICSEARCH',
  AWS_LAMBDA = 'AWS_LAMBDA',
  NONE = 'NONE',
  HTTP = 'HTTP',
  RELATIONAL_DATABASE = 'RELATIONAL_DATABASE',
}

export interface IDataSource extends IResource {
  readonly api: IGraphQLApi
  readonly name: string
  readonly type: DataSourceType
}

export class NoneDataSource extends Resource implements IDataSource {
  readonly api: IGraphQLApi
  readonly name: string
  readonly type: DataSourceType = DataSourceType.NONE
  constructor(scope: Construct, id: string, props: DataSourceProps) {
    super(scope, id)
    this.api = props.api
    this.name = props.name || 'NoneDataSource'

    new CfnDataSource(this, 'Resource', {
      apiId: this.api.apiId,
      name: this.name,
      type: this.type,
    })
  }
}

export interface DynamoDBDataSourceProps extends DataSourceProps {
  table: Table
  permission?: DynamoDBDataSourcePermission
}

export class DynamoDBDataSource extends Resource implements IDataSource {
  public readonly api: IGraphQLApi
  public readonly description?: string
  public readonly name: string
  public readonly table: Table
  public readonly permission: DynamoDBDataSourcePermission
  public readonly type: DataSourceType = DataSourceType.AMAZON_DYNAMODB
  constructor(scope: Construct, id: string, props: DynamoDBDataSourceProps) {
    super(scope, id)
    this.api = props.api
    this.description = props.description
    this.name = props.name || `${props.table.tableName}DataSource`
    this.table = props.table
    this.permission = props.permission || DynamoDBDataSourcePermission.ReadWrite

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

    new CfnDataSource(this, 'Resource', {
      apiId: this.api.apiId,
      description: this.description,
      name: this.name,
      type: this.type,
      dynamoDbConfig: {
        tableName: this.table.tableName,
        awsRegion: region!,
      },
      serviceRoleArn: role.roleArn,
    })
  }
}

export interface LambdaDataSourceProps extends DataSourceProps {
  lambda: Function
}

export class LambdaDataSource extends Resource implements IDataSource {
  public readonly api: IGraphQLApi
  public readonly description?: string
  public readonly name: string
  public readonly lambda: Function
  public readonly type: DataSourceType = DataSourceType.AWS_LAMBDA
  constructor(scope: Construct, id: string, props: LambdaDataSourceProps) {
    super(scope, id)
    this.api = props.api
    this.description = props.description
    this.name = props.name || `${props.lambda.functionName}Datasource`
    this.lambda = props.lambda

    const role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
    })

    this.lambda.grantInvoke(role)

    new CfnDataSource(this, 'Resource', {
      apiId: this.api.apiId,
      description: this.description,
      name: this.name,
      type: this.type,
      lambdaConfig: {
        lambdaFunctionArn: this.lambda.functionArn,
      },
      serviceRoleArn: role.roleArn,
    })
  }
}

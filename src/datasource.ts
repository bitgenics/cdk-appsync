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
  api: IGraphQLApi
  name?: string
}

export interface IDataSource extends IResource {
  api: IGraphQLApi
  name: string
}

export interface DynamoDBDataSourceProps extends DataSourceProps {
  table: Table
  permission?: DynamoDBDataSourcePermission
}

export class DynamoDBDataSource extends Resource implements IDataSource {
  public readonly api: IGraphQLApi
  public readonly name: string
  public readonly table: Table
  public readonly permission: DynamoDBDataSourcePermission
  constructor(scope: Construct, id: string, props: DynamoDBDataSourceProps) {
    super(scope, id)
    this.api = props.api
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
      name: this.name,
      type: 'AMAZON_DYNAMODB',
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
  public readonly name: string
  public readonly lambda: Function

  constructor(scope: Construct, id: string, props: LambdaDataSourceProps) {
    super(scope, id)
    this.api = props.api
    this.name = props.name || `Lambda${props.lambda.functionName}Datasource`
    this.lambda = props.lambda

    const role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
    })

    this.lambda.grantInvoke(role)

    new CfnDataSource(this, 'Resource', {
      apiId: this.api.apiId,
      name: this.name,
      type: 'AWS_LAMBDA',
      lambdaConfig: {
        lambdaFunctionArn: this.lambda.functionArn,
      },
      serviceRoleArn: role.roleArn,
    })
  }
}

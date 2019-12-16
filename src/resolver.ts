import { IDataSource, LambdaDataSource } from './datasource'
import { CfnResolver } from '@aws-cdk/aws-appsync'
import { Construct, Resource, CfnResource } from '@aws-cdk/core'
import { IGraphQLApi } from './graphqlapi'

export interface ResolverProps {
  api: IGraphQLApi
  typeName: string
  fieldName: string
  requestMappingTemplate: string
  dataSource?: IDataSource
  responseMappingTemplate?: string
}

export interface IResolver {
  readonly api: IGraphQLApi
  readonly typeName: string
  readonly fieldName: string
  readonly requestMappingTemplate: string
  readonly responseMappingTemplate: string
  readonly dataSource?: IDataSource
}

abstract class ResolverBase extends Resource implements IResolver {
  public abstract readonly api: IGraphQLApi
  public abstract readonly typeName: string
  public abstract readonly fieldName: string
  public abstract readonly requestMappingTemplate: string
  public abstract readonly responseMappingTemplate: string
  public abstract readonly dataSource?: IDataSource
  constructor(scope: Construct, id: string) {
    super(scope, id)
  }

  protected createCfnResolver() {
    const cfnResolver = new CfnResolver(this, 'Resource', {
      apiId: this.api.apiId,
      typeName: this.typeName,
      fieldName: this.fieldName,
      dataSourceName: this.dataSource ? this.dataSource.name : undefined,
      requestMappingTemplate: this.requestMappingTemplate,
      responseMappingTemplate: this.responseMappingTemplate,
    })
    if (this.dataSource && this.dataSource.node.defaultChild) {
      const defaultChild = this.dataSource.node.defaultChild
      if (defaultChild instanceof CfnResource) {
        cfnResolver.addDependsOn(defaultChild)
      }
    }
  }

  protected addDataSourceDependency(cfnResolver: CfnResolver) {}
}

export class Resolver extends ResolverBase {
  public readonly api: IGraphQLApi
  public readonly typeName: string
  public readonly fieldName: string
  public readonly requestMappingTemplate: string
  public readonly responseMappingTemplate: string
  public readonly dataSource?: IDataSource
  constructor(scope: Construct, id: string, props: ResolverProps) {
    super(scope, id)
    this.api = props.api
    this.dataSource = props.dataSource
    this.typeName = props.typeName
    this.fieldName = props.fieldName
    this.requestMappingTemplate = props.requestMappingTemplate
    this.responseMappingTemplate = props.responseMappingTemplate || `$util.toJson($ctx.result)`

    this.createCfnResolver()
  }
}

export interface LambdaResolverProps {
  api: IGraphQLApi
  dataSource: LambdaDataSource
  fieldName: string
  typeName: string
  batch?: boolean
  includeHeaders?: boolean
  responseMappingTemplate?: string
}

const responseMappingTemplate = `
#if(!$util.isNull($context.result.stash)) 
  #foreach($item in $context.result.stash.entrySet())
    $util.qr($context.stash.put($item.key, $item.value))
  #end
#end

$util.toJson($ctx.result.result)
`

export class LambdaResolver extends ResolverBase {
  public readonly api: IGraphQLApi
  public readonly typeName: string
  public readonly fieldName: string
  public readonly requestMappingTemplate: string
  public readonly responseMappingTemplate: string
  public readonly dataSource?: IDataSource
  constructor(scope: Construct, id: string, props: LambdaResolverProps) {
    super(scope, id)
    this.api = props.api
    this.dataSource = props.dataSource
    this.typeName = props.typeName
    this.fieldName = props.fieldName
    this.responseMappingTemplate = props.responseMappingTemplate || responseMappingTemplate
    this.requestMappingTemplate = `{
      "version": "2017-02-28",
      "operation": "${props.batch ? 'BatchInvoke' : 'Invoke'}",
      "payload": {
        "typeName": "${props.typeName}",
        "fieldName": "${props.fieldName}",
        "arguments": $utils.toJson($context.arguments),
        "identity": $utils.toJson($context.identity),
        "source": $utils.toJson($context.source),
        "stash": $utils.toJson($context.stash),
        ${props.includeHeaders ? '"request": { "headers": $utils.toJson($context.stash)},' : ''}
        "prev": $utils.toJson($context.prev)
      }
    }`
    this.createCfnResolver()
  }
}

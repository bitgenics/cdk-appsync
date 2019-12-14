export interface ResolverProps {
  typeName: string
  fieldName: string
  requestMappingTemplate: string
  responseMappingTemplate?: string
}

export class Resolver {
  public readonly typeName: string
  public readonly fieldName: string
  public readonly requestMappingTemplate: string
  public readonly responseMappingTemplate: string
  constructor(props: ResolverProps) {
    this.typeName = props.typeName
    this.fieldName = props.fieldName
    this.requestMappingTemplate = props.requestMappingTemplate
    this.responseMappingTemplate = props.responseMappingTemplate || `$util.toJson($ctx.result)`
  }
}

export interface LambdaResolverProps {
  typeName: string
  fieldName: string
  batch?: boolean
}

export class LambdaResolver extends Resolver {
  constructor(props: LambdaResolverProps) {
    const full_props: ResolverProps = {
      typeName: props.typeName,
      fieldName: props.fieldName,
      requestMappingTemplate: `
      #set($payload = $context)
      #set($payload.typeName = "${props.typeName}")
      #set($payload.fieldName = "${props.fieldName}")
      {
        "version": "2017-02-28",
        "operation": "${props.batch ? 'BatchInvoke' : 'Invoke'}",
        "payload": $utils.toJson($payload),
      }`,
    }
    super(full_props)
  }
}

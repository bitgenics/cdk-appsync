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

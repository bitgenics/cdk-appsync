export interface RequestMappingTemplate {
  toTemplate(): string
}

export class RawRequestMappingTemplate implements RequestMappingTemplate {
  template: string
  constructor(template: string) {
    this.template = template
  }
  toTemplate() {
    return this.template
  }
}

export enum RequestMappingTemplateVersion {
  V2017 = '2017-02-28',
  V2018 = '2018-05-29',
}

export enum DynamoDBOperation {
  'GetItem' = 'GetItem',
  'Scan' = 'Scan',
}

export interface RequestMapKeyProps {
  partitionKeyName: string
  partitionKeyArgument?: string
  sortKeyName?: string
  sortKeyArgument?: string
}

export class RequestMapKey {
  partitionKeyName: string
  partitionKeyArgument: string
  sortKeyName?: string
  sortKeyArgument?: string
  constructor(props: RequestMapKeyProps) {
    this.partitionKeyName = props.partitionKeyName
    this.partitionKeyArgument = props.partitionKeyArgument || props.partitionKeyName
    this.sortKeyName = props.sortKeyName
    this.sortKeyArgument = props.sortKeyArgument || props.sortKeyName
  }
  toTemplate() {
    let key = `"${this.partitionKeyName}"`
    let value = `$util.dynamodb.toDynamoDBJson($ctx.args.${this.partitionKeyArgument})`
    const partitionLine = `${key}: ${value}${this.sortKeyName ? ',\n' : ''}`
    key = `"${this.sortKeyName}"`
    value = `$util.dynamodb.toDynamoDBJson($ctx.args.${this.sortKeyArgument})`
    const sortLine = `${key}: ${value}`
    return `{ ${partitionLine}${this.sortKeyName ? sortLine : ''} }`
  }
}

export interface GetItemRequestMappingTemplateProps {
  key: string | RequestMapKey
  consistentRead?: boolean
  version?: RequestMappingTemplateVersion
}

export class GetItemRequestMappingTemplate implements RequestMappingTemplate {
  version: RequestMappingTemplateVersion
  operation = DynamoDBOperation.GetItem
  key: string
  consistentRead: boolean

  constructor(props: GetItemRequestMappingTemplateProps) {
    this.version = props.version || RequestMappingTemplateVersion.V2018
    this.key = props.key instanceof RequestMapKey ? props.key.toTemplate() : props.key
    this.consistentRead = props.consistentRead || false
  }
  toTemplate() {
    return `{
  "version": "${this.version}",
  "operation": "${this.operation}",
  "key": ${this.key},
  "consistentRead": ${this.consistentRead}
}`
  }
}

export interface ScanRequestMappingTemplateProps {
  consistentRead?: boolean
  defaultLimit?: number
  index?: string
  limit?: number
  limitArg?: string
  nextTokenArg?: string
  version?: RequestMappingTemplateVersion
}

export class ScanRequestMappingTemplate implements RequestMappingTemplate {
  version: RequestMappingTemplateVersion
  operation = DynamoDBOperation.Scan
  consistentRead?: boolean
  defaultLimit?: number
  index?: string
  limit?: number
  limitArg?: string
  nextTokenArg?: string
  constructor(props: ScanRequestMappingTemplateProps = {}) {
    this.version = props.version || RequestMappingTemplateVersion.V2018
    this.consistentRead = props.consistentRead
    this.defaultLimit = props.defaultLimit
    this.index = props.index
    this.limit = props.limit
    this.limitArg = props.limitArg
    this.nextTokenArg = props.nextTokenArg
  }

  toTemplate() {
    let limitLine = ''
    if (this.limitArg) {
      const defaultLimit = this.defaultLimit || 20
      limitLine = `"limit": $util.defaultIfNull($ctx.args.${this.limitArg}, ${defaultLimit})`
    } else if (this.limit) {
      limitLine = `"limit": ${this.limit}`
    }
    const nextTokenValue = `$util.toJson($util.defaultIfNullOrEmpty($ctx.args.${this.nextTokenArg}, null))`

    return `{
  "version": "${this.version}",
  "operation": "${this.operation}",
  ${this.consistentRead ? `  "consistentRead": ${this.consistentRead},` : ''}
  ${this.index ? `  "index": "${this.index}",` : ''}
  ${limitLine ? `  ${limitLine},` : ''}
  ${this.nextTokenArg ? `  "nextToken": ${nextTokenValue},` : ''}
}`
  }
}

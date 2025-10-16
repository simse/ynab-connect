---
title: Configuration Reference
---

<script setup>
import { data } from './config-reference.data'

const schema = data.schema

// Helper to format property type
const formatType = (prop) => {
  if (prop.type === 'string' && prop.format === 'email') return 'Email'
  if (prop.type === 'string' && prop.const) return `"${prop.const}"`
  if (prop.type === 'integer') return 'Integer'
  if (prop.type === 'string') return 'String'
  if (prop.type === 'object') return 'Object'
  if (prop.type === 'array') return 'Array'
  return prop.type || 'Unknown'
}

// Check if a property is required
const isRequired = (parentRequired, key) => {
  return parentRequired?.includes(key) ? 'Yes' : 'No'
}

// Get account types from schema
const getAccountTypes = () => {
  const accountsProperty = schema.properties?.accounts
  if (!accountsProperty?.items?.anyOf) return []

  return accountsProperty.items.anyOf.map(typeSchema => {
    const typeValue = typeSchema.properties?.type?.const
    return {
      type: typeValue,
      schema: typeSchema
    }
  })
}

const accountTypes = getAccountTypes()

// Helper to format connector type name (e.g., "uk_student_loan" -> "Uk Student Loan")
const formatConnectorName = (type) => {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Helper to format connector slug (e.g., "uk_student_loan" -> "uk-student-loan")
const formatConnectorSlug = (type) => {
  return type.replace(/_/g, '-')
}

// Get top-level properties (excluding 'accounts' which we handle separately)
const getTopLevelSections = () => {
  const props = schema.properties || {}
  return Object.entries(props)
    .filter(([key]) => key !== 'accounts')
    .map(([key, prop]) => ({ key, prop }))
}

const topLevelSections = getTopLevelSections()

// Get common account fields (fields that appear in all account types)
const getCommonAccountFields = () => {
  if (accountTypes.length === 0) return []

  const firstType = accountTypes[0].schema.properties
  const commonFields = []

  for (const [key, prop] of Object.entries(firstType)) {
    // Skip 'type' field as it has different const values for each account type
    if (key === 'type') continue

    // Check if this field exists in all account types
    const isCommon = accountTypes.every(at => at.schema.properties[key])
    if (isCommon) {
      commonFields.push({ key, prop })
    }
  }

  return commonFields
}

const commonAccountFields = getCommonAccountFields()

// Get account-specific fields (excluding common fields)
const getAccountSpecificFields = (accountType) => {
  return Object.entries(accountType.schema.properties)
    .filter(([key]) => !commonAccountFields.some(f => f.key === key))
    .map(([key, prop]) => ({ key, prop }))
}
</script>

# Configuration Reference

{{ schema.description }}

## Top-Level Configuration

The configuration file is a YAML file with the following top-level properties:

<table>
<thead>
<tr>
<th>Property</th>
<th>Type</th>
<th>Required</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr v-for="section in topLevelSections" :key="section.key">
<td><code>{{ section.key }}</code></td>
<td>{{ formatType(section.prop) }}</td>
<td>{{ isRequired(schema.required, section.key) }}</td>
<td>{{ section.prop.description || '' }}</td>
</tr>
<tr>
<td><code>accounts</code></td>
<td>Array</td>
<td>{{ isRequired(schema.required, 'accounts') }}</td>
<td>{{ schema.properties?.accounts?.description || '' }}</td>
</tr>
</tbody>
</table>

<div v-for="section in topLevelSections" :key="section.key">

## {{ section.key.charAt(0).toUpperCase() + section.key.slice(1) }} Configuration

{{ section.prop.description }}

<table>
<thead>
<tr>
<th>Property</th>
<th>Type</th>
<th>Required</th>
<th v-if="section.prop.default">Default</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr v-for="(prop, key) in section.prop.properties" :key="key">
<td><code>{{ key }}</code></td>
<td>{{ formatType(prop) }}</td>
<td>{{ isRequired(section.prop.required, key) }}</td>
<td v-if="section.prop.default">{{ prop.default !== undefined ? prop.default : '-' }}</td>
<td>{{ prop.description || '' }}</td>
</tr>
</tbody>
</table>

<div v-if="section.key === 'ynab'">

See the [Create YNAB Token](/guide/create-ynab-token) guide for instructions on obtaining these values.

</div>

<div v-if="section.key === 'browser'">

See the [Browser](/browser) documentation for more information.

</div>

</div>

## Accounts Configuration

{{ schema.properties?.accounts?.description }}

### Common Account Fields

All account types share these fields:

<table>
<thead>
<tr>
<th>Property</th>
<th>Type</th>
<th>Required</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr v-for="field in commonAccountFields" :key="field.key">
<td><code>{{ field.key }}</code></td>
<td>{{ formatType(field.prop) }}</td>
<td>Yes</td>
<td>{{ field.prop.description || '' }}</td>
</tr>
</tbody>
</table>

### Account Types

<div v-for="accountType in accountTypes" :key="accountType.type">

#### {{ formatConnectorName(accountType.type) }}

**Type:** `{{ accountType.type }}`

<table>
<thead>
<tr>
<th>Property</th>
<th>Type</th>
<th>Required</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr v-for="field in getAccountSpecificFields(accountType)" :key="field.key">
<td><code>{{ field.key }}</code></td>
<td>{{ formatType(field.prop) }}</td>
<td>{{ isRequired(accountType.schema.required, field.key) }}</td>
<td>{{ field.prop.description || '' }}</td>
</tr>
</tbody>
</table>

<p>See the <a :href="`/connectors/${formatConnectorSlug(accountType.type)}`">{{ formatConnectorName(accountType.type) }}</a> connector documentation for setup instructions.</p>

</div>

## Notes

- You can configure multiple accounts of the same type
- The `interval` field uses cron syntax. Use [crontab.guru](https://crontab.guru/) to help create cron expressions
- Make sure each account has a unique `name`
- The configuration file should be placed at `/config.yaml` in production, or in the project root for development

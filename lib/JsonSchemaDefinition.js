'use strict';
const ForeginDefinition = require('./ForeginDefinition');
const Sequelize = require('sequelize');
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
/**
 * Model Definition Adapter for JSON Schema
 */
class JsonSchemaDefinition extends ForeginDefinition {
  /**
   *
   * @param jsonSchemas {Object|Array} A list of json schemas or a single Json schema object
   * @param schemaId {string|null} The schema id to build the model definition from
   * @param options
   * @param options.uniqueFields {Array} a list of fields that have the UNIQUE constraint
   * @param options.notNullFields {Array} a list of fields that have the NOT NULL constraint
   * @param options.mixinFields {Array} a list of fields that have $refs that will get the referenced
   * property mixed in. For example, the schema property `"address": { "$ref": "http://schema.com/address" }`
   * will result in "address" prefixed fields to be generated from the address schema,
   * resulting in fields like "addressStreetName", "addressStreetNumber", etc.
   *
   * @param options.customFieldDefinitions {object} Override the generated field definitions with your own. Field name to field definition mapping.
   */
  constructor(jsonSchemas, schemaId, options) {
    super();
    this.options = options || {};
    // Convert array of json schemas into a map based on schema id
    this.jsonSchemaCollection = (jsonSchemas instanceof Array) ?
      jsonSchemas.reduce((schemas, curr) => { schemas[curr.id] = curr; return schemas; }, {}) : undefined;
    if (this.jsonSchemaCollection && (!schemaId || !this.jsonSchemaCollection[schemaId])) {
      throw new Error('schemaId must be provided OR schema not found');
    }
    // Set the schema we're processing
    this.jsonSchema = (jsonSchemas instanceof Array) ?
      this.jsonSchemaCollection[schemaId] : jsonSchemas;
    this.jsonSchemas = (jsonSchemas instanceof Array) ?
      jsonSchemas : [ this.jsonSchema ];
    this.modelDefinition = {};
    if (!this.jsonSchema) throw new Error('Schema id not found in provided list of schemas!');
    this.uniqueFields = this.options.uniqueFields || [];
    this.notNullFields = this.options.notNullFields || [];
    this.mixinFields = this.options.mixinFields || [];
    this.customFieldDefinitions = this.options.customFieldDefinitions || {};
  }

  /**
   * Compiles the given JSON schema property to Sequelize model definition(s)
   * @param propName
   * @returns {Object}
   */
  compileProperty(propName) {
    const modelDef = this.modelDefinition;
    const schemaProp = this.jsonSchema.properties[propName];
    const referencedSchema = (this.jsonSchemaCollection) ?
      this.jsonSchemaCollection[schemaProp.$ref] : undefined;
    const isMixin = (this.mixinFields.indexOf(propName) > -1);
    const isUnique = (this.uniqueFields.indexOf(propName) > -1);
    const allowNull = !(this.notNullFields.indexOf(propName) > -1);
    const customFieldDef = this.customFieldDefinitions[propName];
    const fieldDef = {};
    if (!isMixin) {
      // Set the new model field def if this is not a mixin (setting multiple fields)
      modelDef[propName] = fieldDef;
    }
    if (referencedSchema || schemaProp.type === 'object' || schemaProp.type === 'array') {
      const subSchema = referencedSchema || schemaProp;
      if (!isMixin) { // no need to care about sub-schema then, just use JSON field type
        // JSONB vs JSON: http://stackoverflow.com/a/33731703
        fieldDef.type = Sequelize.JSONB;
      } else { // Compile subschema into model defs
        this.compileSubSchema(subSchema, propName);
      }
    } else {
      if (schemaProp.description) fieldDef.description = schemaProp.description;
      switch (schemaProp.type) {
        case 'string':
          // Fun fact: performance for TEXT is the same as VARCHAR in postgres:
          // http://blog.jonanin.com/2013/11/20/postgresql-char-varchar/
          let type = (schemaProp.maxLength && schemaProp.maxLength <= 255) ? Sequelize.STRING : Sequelize.TEXT;
          if (schemaProp.enum) {
            type = Sequelize.ENUM.apply(this, schemaProp.enum);
          } else if (schemaProp.format) {
            type = JsonSchemaDefinition.getSequelizeTypeFromJsonFormat(schemaProp.format) || type;
          }
          fieldDef.type = type;
          break;
        case 'number':
          fieldDef.type = Sequelize.REAL;
          break;
        case 'integer':
          fieldDef.type = Sequelize.INTEGER;
          break;
        case 'boolean':
          fieldDef.type = Sequelize.BOOLEAN;
          break;
        default:
          if (!customFieldDef) {
            // No defintiion mapping for this type!
            throw new Error(`Unsupported JSON schema property type '${schemaProp.type}' for property '${propName}'`);
          }
      }
    }

    // Replace with custom field definition if provided
    if (customFieldDef) {
      modelDef[propName] = customFieldDef;
    }

    fieldDef.unique = isUnique;
    fieldDef.allowNull = allowNull;

    return this;
  }

  compileSubSchema(subJsonSchema, propPrefix) {
    const modelDef = this.modelDefinition;
    const subDef = new JsonSchemaDefinition(this.jsonSchemas, subJsonSchema.id, this.options)
      .compileAllProps()
      .getModelDefinition();
    // Mix-in the sub definition with current definition,
    // prefixing the field name with this current propName
    for (const subPropName in subDef) {
      if (subDef.hasOwnProperty(subPropName)) {
        const subProbDef = subDef[subPropName];
        const propName = propPrefix + capitalize(subPropName);
        subProbDef.unique = (this.uniqueFields.indexOf(propName) > -1);
        subProbDef.allowNull = !(this.notNullFields.indexOf(propName) > -1);

        modelDef[propName] = subProbDef;
      }
    }
  }

  compileAllProps() {
    for (const propName in this.jsonSchema.properties) {
      if (this.jsonSchema.properties.hasOwnProperty(propName)) {
        this.compileProperty(propName);
      }
    }

    return this;
  }

  applyCustomDefinitions() {
    for (const fieldName in this.customFieldDefinitions) {
      if (this.customFieldDefinitions.hasOwnProperty(fieldName)) {
        this.modelDefinition[fieldName] = this.customFieldDefinitions[fieldName];
      }
    }

    return this;
  }

  static getSequelizeTypeFromJsonFormat(format) {
    switch (format) {
      case 'date':
        return Sequelize.DATEONLY;
      case 'date-time':
        return Sequelize.DATE;
      default:
        return undefined;
    }
  }
}

module.exports = JsonSchemaDefinition;

'use strict';
const JsonSchemaDefinition = require('./lib/JsonSchemaDefinition');

/**
 * [![Build Status](https://travis-ci.org/ronalddddd/sequelizer.svg?branch=master)](https://travis-ci.org/ronalddddd/sequelizer)
 *
 * Transform foreign schema definitions to Sequelize model definitions
 */
class Sequelizer {
  /**
   * Convert a JSON schema into a Sequelize [model definition](http://docs.sequelizejs.com/en/latest/docs/models-definition/#definition)
   *
   * See [example/fromJsonSchema.js](example/fromJsonSchema.js) for example usage.
   *
   * @param schemas {Object|Array} A list of json schemas or a single Json schema object.
   * @param schemaId {string|null} The schema id to build the model definition from.
   * @param options
   * @param options.uniqueFields {Array} a list of fields that have the UNIQUE constraint
   * @param options.notNullFields {Array} a list of fields that have the NOT NULL constraint
   * @param options.mixinFields {Array} a list of properties that are sub-schemas (`object` or `$ref` types) to "flatten" into the model definition.
   * For example, the schema property `"address": { "$ref": "http://example.com/schemas/address" }`
   * will create "address" prefixed fields from the address sub-schema,
   * resulting in model fields like "addressStreetName", "addressStreetNumber", etc.
   * @param options.customFieldDefinitions {object} Override the generated field definitions with your own. Field name to field definition mapping.
   * @returns {Object} The model definition to use with `sequelize.define()`.
   */
  static fromJsonSchema(schemas, schemaId, options) {
    return new JsonSchemaDefinition(schemas, schemaId, options)
      .compileAllProps()
      .applyCustomDefinitions()
      .getModelDefinition();
  }
}

module.exports = Sequelizer;
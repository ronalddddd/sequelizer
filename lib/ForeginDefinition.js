'use strict';

/**
 * Abstract class for constructing the Sequelize model definition from a foreign definition.
 */
class ForeignDefinition {
  constructor() {
    this.modelDefinition = {};
  }

  getModelDefinition() {
    return this.modelDefinition;
  }
}

module.exports = ForeignDefinition;

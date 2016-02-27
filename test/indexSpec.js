/*eslint-env node, mocha */
/*eslint-disable no-unused-expressions */
/*eslint-disable guard-for-in */
'use strict';
const expect = require('chai').expect;
const Modelize = require('../index');
const Sequelize = require('sequelize');
const jsonSchemas = [
  require('../example/schemas/user.schema.json'),
  require('../example/schemas/address.schema.json'),
];
describe('Modelize', () => {
  describe('fromJsonSchema()', () => {
    const definition = Modelize.fromJsonSchema(jsonSchemas, 'http://api.example.com/v1/schemas/user', {
      uniqueFields: ['username'],
      mixinFields: ['homeAddress', 'billingAddress'],
      customFieldDefinitions: {
        passwordHash: {
          type: Sequelize.TEXT
        },
        password: {
          type: Sequelize.VIRTUAL,
          set(val) {
            this.setDataValue('password_hash', val + '_salt');
          }
        },
      },
    });

    it('should return an object', (done) => { expect(typeof definition).to.equal('object'); done(); });

    it('definition should contain correct number of fields', (done) => {
      const expectedFieldCount = 14;
      let fieldCount = 0;
      for(const k in definition) {
        if(definition.hasOwnProperty(k)) {
          fieldCount ++;
        }
      }

      expect(fieldCount).to.equal(expectedFieldCount);
      done();
    });

    it('should have to correct type definitions', (done) => {
      expect(definition.active.type.key).to.equal('BOOLEAN');
      expect(definition.effectiveDate.type.key).to.equal('DATE');
      expect(definition.username.type.key).to.equal('STRING');
      expect(definition.password.type.key).to.equal('VIRTUAL');
      expect(definition.passwordHash.type.key).to.equal('TEXT');
      expect(definition.email.type.key).to.equal('TEXT');
      //expect(definition.role).to.equal( ??? );
      expect(definition.tags.type.key).to.equal('JSONB');
      expect(definition.homeAddressStreetName.type.key).to.equal('TEXT');
      expect(definition.homeAddressLat.type.key).to.equal('REAL');
      expect(definition.homeAddressLng.type.key).to.equal('REAL');
      expect(definition.billingAddressStreetName.type.key).to.equal('TEXT');
      expect(definition.billingAddressLat.type.key).to.equal('REAL');
      expect(definition.billingAddressLng.type.key).to.equal('REAL');
      done();
    });

  });
});
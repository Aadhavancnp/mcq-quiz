import { addRxPlugin } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
addRxPlugin(RxDBDevModePlugin);

const db = await createRxDatabase({
  name: 'quiz',
  storage: wrappedValidateAjvStorage({
    storage: getRxStorageDexie()
  })
});

const userSchema = {
  version: 0,
  primaryKey: 'email',
  type: 'object',
  properties: {
      name: {
          type: 'string'
      },
      email: {
          type: 'string',
          maxLength: 250
      },
      password: {
          type: 'string',
      }
  },
  required: ['name', 'email', 'password']
};

const questionSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 36
      },
      question: {
          type: 'string'
      },
      answer: {
          type: 'number'
      },
      options: {
          type: 'array',
          items: {
              type: 'string'
          }
      },
      category: {
          type: 'string'
      }
  },
  required: ['id', 'question', 'answer', 'options', 'category']
};


await db.addCollections({
  users: {
    schema: userSchema
  },
  questions: {
    schema: questionSchema
  }
});

export default db;
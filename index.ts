function exampleMaker(schema: any) {
    const typeMap = schema.getTypeMap();
    let examples = {};
  
    for (let typeName in typeMap) {
      if (typeName === 'Query' || typeName === 'Mutation') {
        const fields = typeMap[typeName].getFields();
  
        for (let fieldName in fields) {
          const field = fields[fieldName];
          // @ts-ignore
          let args = field.args.map(arg => arg.name + ': ' + JSON.stringify('value'));
          let operation = typeName === 'Query' ? 'query' : 'mutation';
          let exampleValue = {
            query: `${operation} { ${fieldName}${args.length > 0 ? '(' + args.join(', ') + ')' : ''} }`
          };
          // @ts-ignore
          examples[`${fieldName}Example`] = {
            summary: `Example ${typeName}`,
            value: exampleValue
          };
        }
      }
    }
  
    return examples;
}


export const generateOpenAPISchema = (graphQLSchema: any, serverUrl = '/graphql', title = 'GraphQL API', openapi: '3.0.3', version: '1.0.0', summary = 'GraphQL Endpoint', description = 'Endpoint for all GraphQL queries and mutations') => {
    const examples = exampleMaker(graphQLSchema);
  
    return {
      openapi: openapi,
      info: {
        title: title,
        version: version,
      },
      servers: [{ url: serverUrl }],
      paths: {
        [serverUrl]: {
          post: {
            summary: summary,
            description: description,
            requestBody: {
              description: 'GraphQL Query or Mutation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'GraphQL Query or Mutation'
                      },
                      variables: {
                        type: 'object',
                        additionalProperties: true,
                        description: 'Variables for the query or mutation'
                      }
                    },
                    required: ['query']
                  },
                  examples: examples
                }
              }
            },
            responses: {
              '200': {
                description: 'Successful GraphQL response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      additionalProperties: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }
  

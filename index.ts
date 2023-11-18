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

interface OpenApiSchemaOptions {
  serverUrl: string;
  title: string;
  openapi: string;
  version: string;
  summary: string;
  description: string;
}

const defaultOptions: OpenApiSchemaOptions = {
  serverUrl: '/graphql',
  title: 'GraphQL API',
  openapi: '3.0.3',
  version: '1.0.0',
  summary: 'GraphQL Endpoint',
  description: 'Endpoint for all GraphQL queries and mutations'
};

const createRequestBodySchema = (examples: any) => ({
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
});

const createResponseSchema = () => ({
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
});

interface Example {
  summary: string;
  value: {
    query: string;
  }
}

export const generateOpenAPISchema = (
  graphQLSchema: any, 
  options: Partial<OpenApiSchemaOptions> = {}
) => {
  const { serverUrl, title, openapi, version, summary, description } = { ...defaultOptions, ...options };
  const examples = exampleMaker(graphQLSchema);
  console.log(examples);

  let paths: any = {};

  for (const [exampleName, exampleData] of Object.entries(examples)) {
    const example = exampleData as Example
    const path = `/${exampleName}`;
    paths[path] = {
      post: {
        summary: example.summary,
        description: `Example for ${exampleName}`,
        requestBody: {
          description: `Request for ${exampleName}`,
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    example: example.value.query
                  }
                },
                required: ['query']
              }
            }
          }
        },
        responses: createResponseSchema() // Assuming this is a function that creates a generic response schema
      }
    };
  }

  return {
    openapi,
    info: {
      title,
      version,
    },
    servers: [{ url: serverUrl }],
    paths: paths
  };
};

import {
  GraphQLScalarType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLOutputType
} from 'graphql';

export function createScalarMock(type: GraphQLOutputType): any {
  if (type instanceof GraphQLScalarType || type instanceof GraphQLNonNull || type instanceof GraphQLList) {
    switch (type.toString()) {
      case 'String':
        return 'Sample string';
      case 'Int':
        return 123;
      case 'Float':
        return 123.45;
      case 'Boolean':
        return true;
      default:
        return null;
    }
  }
  return null;
}

export function isScalarType(type: GraphQLOutputType): boolean {
  return (
    type instanceof GraphQLScalarType ||
    (type instanceof GraphQLNonNull && isScalarType(type.ofType)) ||
    (type instanceof GraphQLList && isScalarType(type.ofType))
  );
}

export function determineGraphQLType(type: GraphQLOutputType): string {
  if (type instanceof GraphQLScalarType) {
    switch (type.name) {
      case 'String':
        return 'string';
      case 'Int':
        return 'integer';
      case 'Float':
        return 'number';
      case 'Boolean':
        return 'boolean';
      case 'ID':
        return 'string'; // ID is often represented as a string in OpenAPI
      default:
        return 'unknown';
    }
  } else if (type instanceof GraphQLNonNull) {
    // Non-null type, check the inner type
    return determineGraphQLType(type.ofType);
  } else if (type instanceof GraphQLList) {
    // For lists, you can either return 'array' or handle more specifically
    return 'array';
  }
  // Add handling for other types like enums, objects, etc.
  return 'unknown';
}

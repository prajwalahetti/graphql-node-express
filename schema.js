const {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLList,
  GraphQLID,
} = require('graphql');

// Dummy data
const authors = [
  { id: '1', name: 'Author 1' },
  { id: '2', name: 'Author 2' },
];

const books = [
  { id: '1', title: 'Book 1', authorId: '1' },
  { id: '2', title: 'Book 2', authorId: '1' },
  { id: '3', title: 'Book 3', authorId: '2' },
];

const BookType = new GraphQLObjectType({
  name: 'Book',
  fields: () => ({
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    author: {
      type: AuthorType,
      resolve: (parent, args) => authors.find(author => author.id === parent.authorId),
    },
  }),
});

const AuthorType = new GraphQLObjectType({
  name: 'Author',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    books: {
      type: new GraphQLList(BookType),
      resolve: (parent, args) => books.filter(book => book.authorId === parent.id),
    },
  }),
});

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    book: {
      type: BookType,
      args: { id: { type: GraphQLID } },
      resolve: (parent, args) => books.find(book => book.id === args.id),
    },
    books: {
      type: new GraphQLList(BookType),
      args: {
        bookIds: { type: new GraphQLList(GraphQLID) },
      },
      resolve: (parent, args) => {
        if (args.bookIds && args.bookIds.length > 0) {
          // Fetch details for multiple books by their IDs
          return books
            .filter(book => args.bookIds.includes(book.id))
            .map(book => ({ ...book, author: authors.find(a => a.id === book.authorId) }));
        } else {
          // If no book IDs provided, return all books with their authors
          return books.map(book => ({ ...book, author: authors.find(a => a.id === book.authorId) }));
        }
      },
    },
    authors: {
      type: new GraphQLList(AuthorType),
      resolve: () => authors,
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
});


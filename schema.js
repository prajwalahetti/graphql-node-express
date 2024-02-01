const {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLList,
  GraphQLID,
} = require("graphql");
const sqlite3 = require("sqlite3");

// Connect to the SQLite database
const db = new sqlite3.Database("./library.db");

// Create tables if they don't exist
db.serialize(() => {
  db.run("drop table authors");
  db.run("drop table books");
  db.run(
    "CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, authorId INTEGER REFERENCES authors(id))"
  );

  // Insert dummy data
  const authorsInsert = db.prepare("INSERT INTO authors (name) VALUES (?)");
  const booksInsert = db.prepare(
    "INSERT INTO books (title, authorId) VALUES (?, ?)"
  );

  for (let iterator = 1; iterator <= 10; iterator++) {
    authorsInsert.run(`Author ${iterator}`);
    booksInsert.run(`Book ${iterator}`, iterator);
  }

  authorsInsert.finalize();
  booksInsert.finalize();
});

const BookType = new GraphQLObjectType({
  name: "Book",
  fields: () => ({
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    authorId: { type: GraphQLID },
    author: {
      type: AuthorType,
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          db.get(
            "SELECT * FROM authors WHERE id = ?",
            [parent.authorId],
            (err, row) => {
              if (err) reject(err);
              resolve(row);
            }
          );
        });
      },
    },
  }),
});

const AuthorType = new GraphQLObjectType({
  name: "Author",
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    books: {
      type: new GraphQLList(BookType),
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          db.all(
            "SELECT * FROM books WHERE authorId = ?",
            [parent.id],
            (err, rows) => {
              if (err) reject(err);
              resolve(rows);
            }
          );
        });
      },
    },
  }),
});

// Root Query
const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    books: {
      type: new GraphQLList(BookType),
      args: {
        bookIds: { type: new GraphQLList(GraphQLID) },
      },
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          let query;
          let values;

          if (args.bookIds && args.bookIds.length > 0) {
            const placeHolder = args.bookIds.map(() => "?").join(", ");
            // If book IDs are provided, fetch details for those books
            query = `SELECT books.*, authors.name AS authorName FROM books INNER JOIN authors ON books.authorId = authors.id WHERE books.id IN (${placeHolder})`;
            values = args.bookIds;
          } else {
            // If no book IDs provided, fetch data for all books
            query =
              "SELECT books.*, authors.name AS authorName FROM books INNER JOIN authors ON books.authorId = authors.id";
            values = [];
          }

          db.all(query, values, (err, rows) => {
            if (err) reject(err);
            resolve(rows);
          });
        });
      },
    },
    authors: {
      type: new GraphQLList(AuthorType),
      args: {
        authorIds: { type: new GraphQLList(GraphQLID) },
      },
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          let query;
          let values;

          if (args.authorIds && args.authorIds.length > 0) {
            const placeHolder = args.authorIds.map(() => "?").join(", ");
            // If author IDs are provided, fetch details for those authors
            query = `SELECT authors.*, books.title AS bookTitle FROM authors LEFT JOIN books ON authors.id = books.authorId WHERE authors.id IN (${placeHolder})`;
            values = args.authorIds;
          } else {
            // If no author IDs provided, fetch data for all authors
            query =
              "SELECT authors.*, books.title AS bookTitle FROM authors LEFT JOIN books ON authors.id = books.authorId";
            values = [];
          }

          db.all(query, values, (err, rows) => {
            if (err) reject(err);
            // Group the rows by author to include all books for each author
            const groupedAuthors = rows.reduce((acc, row) => {
              const author = acc.find((a) => a.id === row.id);
              if (author) {
                author.books.push({ id: row.authorId, title: row.bookTitle });
              } else {
                acc.push({
                  id: row.id,
                  name: row.name,
                  books: row.authorId
                    ? [{ id: row.authorId, title: row.bookTitle }]
                    : [],
                });
              }
              return acc;
            }, []);
            resolve(groupedAuthors);
          });
        });
      },
    },
  },
});

const Mutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    // Create operation for adding an author
    addAuthor: {
      type: AuthorType,
      args: {
        name: { type: GraphQLString },
      },
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          const query = "INSERT INTO authors (name) VALUES (?)";
          db.run(query, [args.name], function (err) {
            if (err) reject(err);
            resolve({ id: this.lastID, name: args.name, books: [] });
          });
        });
      },
    },
    // Create operation for adding a book
    addBook: {
      type: BookType,
      args: {
        title: { type: GraphQLString },
        authorId: { type: GraphQLID },
      },
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          const query = "INSERT INTO books (title, authorId) VALUES (?, ?)";
          db.run(query, [args.title, args.authorId], function (err) {
            if (err) reject(err);
            resolve({
              id: this.lastID,
              title: args.title,
              authorId: args.authorId,
            });
          });
        });
      },
    },
    updateBook: {
      type: BookType,
      args: {
        id: { type: GraphQLID },
        title: { type: GraphQLString },
        authorId: { type: GraphQLID },
      },
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          const query = "UPDATE books SET title = ?, authorId = ? WHERE id = ?";
          db.run(query, [args.title, args.authorId, args.id], function (err) {
            if (err) reject(err);
            resolve({
              id: args.id,
              title: args.title,
              authorId: args.authorId,
            });
          });
        });
      },
    },
    // Update operation for updating an author's name
    updateAuthor: {
      type: AuthorType,
      args: {
        id: { type: GraphQLID },
        name: { type: GraphQLString },
      },
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          const query = "UPDATE authors SET name = ? WHERE id = ?";
          db.run(query, [args.name, args.id], function (err) {
            if (err) reject(err);
            resolve({ id: args.id, name: args.name, books: [] });
          });
        });
      },
    },
    // Delete operation for deleting a book
    deleteBook: {
      type: BookType,
      args: {
        id: { type: GraphQLID },
      },
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          const query = "DELETE FROM books WHERE id = ?";
          db.get("SELECT * FROM books WHERE id = ?", [args.id], (err, row) => {
            if (err) reject(err);
            db.run(query, [args.id], function (err) {
              if (err) reject(err);
              resolve(row);
            });
          });
        });
      },
    },
    deleteAuthor: {
      type: AuthorType,
      args: {
        id: { type: GraphQLID },
      },
      resolve: (parent, args) => {
        return new Promise((resolve, reject) => {
          const query = "DELETE FROM authors WHERE id = ?";
          db.get(
            "SELECT * FROM authors WHERE id = ?",
            [args.id],
            (err, row) => {
              if (err) reject(err);
              db.run(query, [args.id], function (err) {
                if (err) reject(err);
                resolve(row);
              });
            }
          );
        });
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
});

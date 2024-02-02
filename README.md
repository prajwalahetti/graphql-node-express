# graphql-node-express

Simple Beginners Graphql setup with Node and Express

Running the Application
git clone <repo link>
cd graphql-node-express
npm install
npm start 3000 or npm start <specific port>

open
localhost:<PORT>/graphql

Project Details

Table Book
id
title
authorId

Table Author
id
name

Relations between table many to many

GraphQL API queries

books {
  id
  title
  authorId
  author {
    id
    name
  }
}

books(bookIds: ["1", "3"]) {
  id
  title
  authorId
  author {
    id
    name
  }
}

authors {
  id
  name
  books {
    id
    title
    authorId
  }
}

authors(authorIds: ["7"]) {
  id
  name
  books {
    id
    title
    authorId
  }
}

mutation {
  addAuthor(name: "New Author") {
    id
    name
  }
  
  addBook(title: "New Book", authorId: 7) {
    id
    title
    authorId
    author {
      id
      name
    }
  }
  
  updateBook(id: 12, title: "Updated Book Title", authorId: 2) {
    id
    title
    authorId
    author {
      id
      name
    }
  }
  
  updateAuthor(id: 1, name: "Updated Author Name") {
    id
    name
  }
  
  deleteBook(id: 1) {
    id
    title
    authorId
  }
  
  deleteAuthor(id: 1) {
    id
    name
  }
}


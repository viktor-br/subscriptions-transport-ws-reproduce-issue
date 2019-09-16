const {ApolloServer, gql, PubSub} = require('apollo-server');
const wait = require('waait');

const typeDefs = gql`
    type Message {
        id: Int!
        content: String!
    }

    type Query {
        message(id: Int!): Message!
    }

    type Mutation {
        sendMessage(content: String!): Message
    }

    type Subscription {
        message(subscriberId: Int!): Message!
    }
`;

const sendMessage = (_, {content}, {pubsub}) => {
  const message = {id: 12345, content};
  console.log((new Date()).toLocaleString(), 'mutation called');
  pubsub.publish('message', {message});

  return message;
};

const messageQuery = (_, __, {}) => ({id: 12345, content: 'message content'});

const messageSubscription = {
  resolve: (
    {message},
    {subscriberId},
    context,
  ) => {
    console.log((new Date()).toLocaleString(), `subscription:resolve #${subscriberId} called`);
    return message;
  },
  subscribe: async (_, {subscriberId}, {pubsub}) => {
    console.log((new Date()).toLocaleString(), `subscription:subscribe #${subscriberId} start`);
    await wait(2000);
    console.log((new Date()).toLocaleString(), `subscription:subscribe #${subscriberId} end`);
    return pubsub.asyncIterator('message');
  },
};

const resolvers = {
  Mutation: {
    sendMessage,
  },
  Query: {
    message: messageQuery,
  },
  Subscription: {
    message: messageSubscription,
  },
};

const pubsub = new PubSub();
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({req, connection}) => {
    if (connection) {
      return {...connection.context, pubsub};
    } else {
      const token = req.headers.authorization || "";

      return {pubsub, token};
    }
  },
  subscriptions: {
    path: '/ws/',
  },
});

server.listen().then(({url}) => {
  console.log(`Server ready at ${url}`);
});

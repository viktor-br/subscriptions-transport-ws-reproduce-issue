const fetch = require('node-fetch');
const { createHttpLink } = require('apollo-link-http');
const { InMemoryCache } = require('apollo-cache-inmemory');
const { ApolloClient } = require('apollo-client');
const gql = require('graphql-tag');
const {WebSocketLink} = require('apollo-link-ws');
const {split} = require('apollo-link');
const {getMainDefinition} = require('apollo-utilities');
const ws = require('ws');
const wait = require('waait');

const wsLink = new WebSocketLink({
  uri: 'ws://localhost:4000/ws/',
  options: {
    reconnect: true,
  },
  webSocketImpl: ws,
});

const httpLink = createHttpLink({
  uri: 'http://localhost:4000/',
  fetch: fetch
});

const link = split(
  ({ query }) => {
    const { kind, operation } = getMainDefinition(query);
    return kind === 'OperationDefinition' && operation === 'subscription';
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache()
});

const MESSAGE_MUTATION = gql`
    mutation {
        sendMessage(content: "123456789") {
            id
            content
        }
    }
`;

const mutate = async (timeout) => {
  await wait(timeout);
  console.log((new Date()).toLocaleString(), `mutation called`);
  return client
    .mutate({
      mutation: MESSAGE_MUTATION,
    });
};

const MESSAGE_SUBSCRIPTION = gql`
    subscription message($subscriberId: Int!) {
        message(subscriberId: $subscriberId) {
            id
            content
        }
    }
`;

const subscribe = (index) => {
  console.log((new Date()).toLocaleString(), `subscribe for #${index}`);

  return client.subscribe({
    query: MESSAGE_SUBSCRIPTION,
    variables: {
      subscriberId: index,
    },
  })
    .subscribe({
      next: (data) => console.log((new Date()).toLocaleString(), `subscription #${index} results received`),
      error: (err) => console.error(`error in subscription #${index}`, err),
    });
};

const unsubscribe = async (subscription, index, timeout) => {
  console.log((new Date()).toLocaleString(), `unsubscribe for #${index} start`);
  await wait(timeout);
  await subscription.unsubscribe();

  return index;
};

const subscription1 = subscribe(1, 0);
const subscription2 = subscribe(2, 0);
mutate(3000).catch(() => console.log('mutation failed'));

unsubscribe(subscription1, 1, 1000).then((index) => console.log((new Date()).toLocaleString(), `unsubscribe for #${index} completed`));




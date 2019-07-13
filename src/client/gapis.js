function start() {
  gapi.client.init({
    apiKey: 'AIzaSyCCYcP0hqLRaj2uf5ya3eS7sbjklQY9-Z8'
    // clientId and scope are optional if auth is not required.
    // clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    // scope: 'profile'
  });
}

function gapiInitialize() {
  if (!window.gapi || !!window.gapi.client) {
    console.warn('No GAPI or it loaded', window.gapi);
    return;
  }
  gapi.load('client', {
    callback: start,
    onerror() {
      console.warn('Google api loaded error');
    },
    timeout: 5000,
    ontimeout() {
      console.warn('Google api loaded timeout');
    }
  });
}

export { gapiInitialize };

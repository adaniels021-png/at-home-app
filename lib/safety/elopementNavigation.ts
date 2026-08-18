import type { Router } from 'expo-router';

let profileReturnToSearch = false;

export function returnToActiveSearch(router: Router) {
  router.dismissTo({
    pathname: '/safety/emergency/elopement',
    params: { screen: 'search' },
  });
}

export function markProfileReturnToSearch() {
  profileReturnToSearch = true;
}

export function shouldReturnProfileToSearch() {
  return profileReturnToSearch;
}

export function consumeProfileReturnToSearch() {
  const requested = profileReturnToSearch;
  profileReturnToSearch = false;
  return requested;
}

export function goBackOrSafety(router: Router) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/safety');
  }
}

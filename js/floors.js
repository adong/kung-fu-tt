/* Kung Fu TT: the five floors of the temple. Each is one long hall; the direction alternates (floor 1 walks left,
   floor 2 right...), and a boss waits by the stairs at the far end. `mix` is how often each baddie walks in.
   Colours are for js/scene.js; everything else is for the rules (js/sim.js). */
window.KF_FLOORS = [
  {
    name: 'BAMBOO HALL', emoji: '🎋', boss: 'staff', bossName: 'STAFF MASTER', bossLine: 'Spins a long bamboo staff!',
    len: 70, pots: 2, mix: { hugger: 7, thrower: 1, imp: 1 },
    sky: '#bfe8b0', wall: '#e9dcb8', pillar: '#c2362b', floor: '#b7864f', trim: '#2f7d3a', lantern: '#ff4b3a',
  },
  {
    name: 'LANTERN HALL', emoji: '🏮', boss: 'bao', bossName: 'BOOMERANG BAO', bossLine: 'Throws a boomerang. It comes back!',
    len: 76, pots: 3, mix: { hugger: 5, thrower: 3, imp: 2 },
    sky: '#ffd9a8', wall: '#f3e2c4', pillar: '#b8302a', floor: '#a8743f', trim: '#d9a227', lantern: '#ff6a2a',
  },
  {
    name: 'DRUM HALL', emoji: '🥁', boss: 'belly', bossName: 'BIG BELLY GIANT', bossLine: 'Belly bump! Stomp! Jump the wave!',
    len: 80, pots: 3, mix: { hugger: 4, thrower: 2, imp: 4 },
    sky: '#c9d8ff', wall: '#ece3d0', pillar: '#7a2f8f', floor: '#9b6a3c', trim: '#2c5fb8', lantern: '#ff4fa0',
  },
  {
    name: 'CLOUD HALL', emoji: '☁️', boss: 'puff', bossName: 'PUFF MAGICIAN', bossLine: 'Poof! Which one is the real one?',
    len: 84, pots: 4, mix: { hugger: 4, thrower: 3, imp: 3 },
    sky: '#d6c8ff', wall: '#eae6f6', pillar: '#4b3aa8', floor: '#8f6a4a', trim: '#18b4c8', lantern: '#9b6bff',
  },
  {
    name: 'GOLDEN HALL', emoji: '🐼', boss: 'grand', bossName: 'GRAND MASTER', bossLine: 'The last master. Watch his moves!',
    len: 88, pots: 4, mix: { hugger: 4, thrower: 3, imp: 3 },
    sky: '#ffe9a0', wall: '#fbeccb', pillar: '#c8901a', floor: '#a0703a', trim: '#e0b02a', lantern: '#ffcf3a',
  },
];

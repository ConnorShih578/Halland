/* =========================================================
   HAPTICS CONTROLLER
   Crisp micro-vibrations for Mobile & Gamepads
========================================================= */

class HapticsController {
  constructor() {
    this.enabled = true;
    this.hasVibration = 'vibrate' in navigator;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.trigger('tap');
    }
    return this.enabled;
  }

  trigger(type) {
    if (!this.enabled) return;

    // Pattern definitions in milliseconds
    let pattern = [15];

    switch (type) {
      case 'tap':
      case 'light':
        pattern = [12];
        break;
      case 'swipe':
      case 'whoosh':
        pattern = [18];
        break;
      case 'punch':
      case 'hit':
        pattern = [28];
        break;
      case 'heavyHit':
      case 'boardBreak':
        pattern = [35, 20, 45];
        break;
      case 'bodySlam':
        pattern = [50, 25, 75];
        break;
      case 'cannonball':
        pattern = [40, 20, 50];
        break;
      case 'uppercut':
        pattern = [22, 15, 30];
        break;
      case 'backflip':
      case 'dodge':
        pattern = [15, 10, 15];
        break;
      case 'wallKick':
      case 'land':
        pattern = [18];
        break;
      case 'block':
      case 'parry':
        pattern = [30, 20, 30];
        break;
      case 'checkpoint':
        pattern = [25, 35, 45];
        break;
      case 'death':
        pattern = [60, 40, 90];
        break;
    }

    // 1. Mobile Web Vibration API
    if (this.hasVibration) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Safe failover
      }
    }

    // 2. Gamepad DualShock/Xbox Rumble Actuator
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
          const duration = pattern.reduce((a, b) => a + b, 0);
          const intensity = type === 'bodySlam' || type === 'boardBreak' || type === 'death' ? 0.9 : 0.4;
          gp.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: Math.min(duration, 250),
            weakMagnitude: intensity,
            strongMagnitude: intensity * 0.8
          }).catch(() => {});
        }
      }
    }
  }
}

window.Haptics = new HapticsController();

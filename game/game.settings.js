/**
 * # Game settings definition file
 * Copyright(c) 2017 Stefano Balietti
 * MIT Licensed
 *
 * The variables in this file will be sent to each client and saved under:
 *
 *   `node.game.settings`
 *
 * The name of the chosen treatment will be added as:
 *
 *    `node.game.settings.treatmentName`
 *
 * http://www.nodegame.org
 * ---
 */

module.exports = {

    // Variables shared by all treatments.

    // Session counter.
    SESSION_ID: 1,

    // Numnber of game rounds repetitions.
    // TODO: if the value is changed the QUIZ page needs to be updated.
    REPEAT: 2,

    // Minimum number of players that must be always connected.
    MIN_PLAYERS: 4,


    GROUP_NAMES: ['1', '2', '3', '4'],

    // How many player in each group. *
    SUBGROUP_SIZE: 4,

    // Noise standard deviation. High and low "meritocracy".
    NOISE_HIGH: 1.4142,
    NOISE_LOW: 2,

    // Payment settings. *
    GROUP_ACCOUNT_DIVIDER: 2,
    INITIAL_COINS: 20,

    // Divider ECU / DOLLARS *
    EXCHANGE_RATE: 266,

    // Conversion rate ECU to DOLLARS.
    exchangeRate: 0.01,

    TIMER: {

		consent: 90000,
        instructions: 90000,
        quiz: 90000,
        bid: function() {
            var round;
            round = this.getCurrentGameStage().round;
            if (round < 3) return 30000;
            return 15000;
        },
        results: function() {
            var round;
            round = this.getCurrentGameStage().round;
            if (round < 2) return 60000;
            if (round < 3) return 50000;
            return 30000;
        },
        questionnaire: 45000
    },
//d
    // DEBUG.
    DEBUG: false,

    // AUTO-PLAY.
    AUTO: false,

    // DATABASE.
    DB: 'FILE', // FILE, MONGODB

    // Treatments definition.

    treatments: {
        exo_perfect: {
			//consent: 'consent.html'
            instrPage: 'instructions_exo_perfect.html',
            quizPage: 'quiz_exo_perfect.html'
        }
    }
};

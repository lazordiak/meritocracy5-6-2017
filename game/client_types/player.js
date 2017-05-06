/**
 * # Player code for Meritocracy Game
 * Copyright(c) 2017 Stefano Balietti
 * MIT Licensed
 *
 * http://www.nodegame.org
 * ---
 */

module.exports = function(treatmentName, settings, stager, setup, gameRoom) {

    var game = {};

    // Variable here are available to all stages.
    stager.setDefaultGlobals({
        // Total number of players in group.
        totPlayers: gameRoom.game.waitroom.GROUP_SIZE,
    });

    stager.setOnInit(function() {
        var header, frame;
        var COINS;

        console.log('INIT PLAYER!');

        COINS = node.game.settings.INITIAL_COINS;
        node.game.oldContrib = null;
		node.game.oldLie = null;
        node.game.oldPayoff = null;

        // Setup page: header + frame.
        header = W.generateHeader();
        frame = W.generateFrame();

        // Add widgets.
        this.visualRound = node.widgets.append('VisualRound', header);
        this.visualTimer = node.widgets.append('VisualTimer', header);
        this.doneButton = node.widgets.append('DoneButton', header);

        this.isValidContribution = function(n) {
            return false !== JSUS.isInt(n, -1, (COINS + 1));
        };

        // Takes in input the results of _checkInputs_ and correct eventual
        // mistakes. If in the first round a random value is chosen, otherwise
        // the previous decision is repeated. It also updates the screen.
        this.correctInputs = function(checkResults) {
            var contrib;
            var errorC, errorD;

            if (checkResults) {
                contrib = JSUS.isInt(W.getElementById('contribution').value);
            }
            else {
                if (!node.game.oldContrib) contrib = JSUS.randomInt(-1, 20);
                else contrib = node.game.oldContrib;
                
                errorC = document.createElement('p');
                errorC.innerHTML = 'Your contribution was set to ' +contrib;
                W.getElementById('divErrors').appendChild(errorC);
                W.getElementById('contribution').value = contrib;
            }

            return contrib;
        };

        // Retrieves and checks the current input for contribution.
        // Returns an object with the results of the
        // validation. It also displays a message in case errors are found.
        this.checkInputs = function() {
            var contrib, lieval;
            var divErrors, errorC;

            // Clear previous errors.
            divErrors = W.getElementById('divErrors');
            divErrors.innerHTML = '';

            // Always check the contribution.
            contrib = W.getElementById('contribution').value;

            if (!node.game.isValidContribution(contrib)) {
                errorC = document.createElement('p');
                errorC.innerHTML = 'Invalid contribution. ' +
                    'Please enter a number between 0 and ' + COINS;
                divErrors.appendChild(errorC);
            }
			
			//Always check to see if the lie value is valid
			lieval = W.getElementById('lienumber').value;
			console.log('this is the lie val')
			console.log(lieval)
			
			if (!node.game.isValidContribution(lieval)) {
                errorC = document.createElement('p');
                errorC.innerHTML = 'Invalid input. ' +
                    'Please enter a number between 0 and ' + COINS;
                divErrors.appendChild(errorC);
            }
			//console.log(!errorC);
            return !errorC;           
        };

        // This function is called to create the bars.
        this.updateResults = function(barsValues) {
            var group, player, i, j, div, subdiv, color, save;
            var barsDiv;
            var text, groupHeader, groupHeaderText, groupNames;
            var payoffSpan, bars;

            // Notice: _barsValues_ array:
            // 0: array: contr, demand (not used now)
            // 1: array: group, position in group
            // 2: payoff
            // 3: array: groups are compatible or not (not used now)

            groupNames = node.game.settings.GROUP_NAMES;
			
			//SO IT IS THAT where does it get the bars values actually where does it get those
			//in logic.callbacks?
			//gotta figure out how all these bars are working together
			
			console.log('HERES THE BAR VALUES')

            console.log(barsValues);
			
			console.log('AND THOSE WERE THE BAR VALUES')

            barsDiv = W.getElementById('barsResults');
            payoffSpan = W.getElementById('payoff');

            barsDiv.innerHTML = '';

            // Get a reference to the bars obj (see public/js/merit.bars.js).
            bars = W.getFrameWindow().bars;

            // Loop through all the groups (each group contains the
            // players' contributions).
            for (i = 0; i < barsValues[0].length; i++) {
                div = document.createElement('div');
                div.classList.add('groupContainer');

                // The name of the group.
                groupHeader = document.createElement('h4');
                groupHeaderText = 'Group ' + groupNames[i];
                groupHeader.innerHTML = groupHeaderText;

                // Add players contributions in each group.
                barsDiv.appendChild(div);
                div.appendChild(groupHeader);

                group = barsValues[0][i];
                for (j = 0; j < group.length; j++) {

                    player = group[j];

                    // Check the id of the player with own id. It is me?
                    if (barsValues[1][0] === i && barsValues[1][1] === j) {
                        color = [ undefined, '#9932CC' ];
                        text = ' YOU <img src="imgs/arrow.jpg" style="height:15px;"/>';
                    }
                    else {
                        color = [ '#DEB887', '#A52A2A' ];
                        text = '';
                    }

                    // This is the DIV actually containing the bar
                    subdiv = document.createElement('div');
                    div.appendChild(subdiv);
                    bars.createBar(subdiv, player[0], 20, color[0], text);
                }
            }

            node.game.oldPayoff = +barsValues[2]; // final payoff

            // Update the text displaying how much the player won.

            // How many coins player put in personal account.
            save = COINS - node.game.oldContrib;
            payoffSpan.innerHTML = save + ' + ' + (barsValues[2] - save) +
                ' = ' + node.game.oldPayoff;
        };

        this.displaySummaryPrevRound = function() {
            var save, groupReturn;

            // Shows previous round if round number is not 1.
            if (node.game.oldContrib) {

                save = COINS - node.game.oldContrib;
                groupReturn = node.game.oldPayoff - save;

                W.getElementById('previous-round-info').style.display = 'block';

                // Updates display for current round.
                W.setInnerHTML('yourPB', save);
                W.setInnerHTML('yourOldContrib', node.game.oldContrib);
                W.setInnerHTML('yourReturn', groupReturn);
                W.setInnerHTML('yourPayoff', node.game.oldPayoff);
            }
        };

        node.on.data('notEnoughPlayers', function(msg) {
            // Not yet 100% safe. Some players could forge the from field.
            if (msg.from !== '[ADMIN_SERVER]') return;

            node.game.pause();
            W.lockScreen('One player disconnected. We are now waiting to ' +
                         'see if he or she reconnects. If not, the game ' +
                         'will continue with fewer players.');
        });

        node.on('SOCKET_DISCONNECT', function() {
            // Disabled.
            return;
            alert('Connection with the server was terminated. If you think ' +
                  'this is an error, please try to refresh the page. You can ' +
                  'also look for a HIT called Trouble Ticket from the same ' +
                  'requester and file an error report. Thank you for your ' +
                  'collaboration.');
        });

    });

    // STAGES and STEPS.
	
	//consent screen
//
	    stager.extendStep('consent', {
        frame: 'consent.html',
        cb: function() {
            var n, s;

            s = node.game.settings;
            n = node.game.globals.totPlayers;

            W.setInnerHTML('players-count', n);
            W.setInnerHTML('players-count-minus-1', (n-1));
            W.setInnerHTML('rounds-count', s.REPEAT);

            console.log('consent');
        }
    });
//*/

    stager.extendStep('instructions', {
        frame: 'instructions_lie.html',
        cb: function() {
            var n, s;

            s = node.game.settings;
            n = node.game.globals.totPlayers;

            W.setInnerHTML('players-count', n);
            W.setInnerHTML('players-count-minus-1', (n-1));
            W.setInnerHTML('rounds-count', s.REPEAT);

            console.log('Instructions');
        }
    });

    stager.extendStep('quiz', {
        frame: 'quiz.html',
        init: function() {
            this.quizStuff = {
                // Coins.
                coins: 'How many coins do you get each of the 20 rounds ?',
                coinsChoices: [ 20, 10, 5, 'Other' ],
                coinsCorrect: 0,
                // Lowest Pay.
                lowestPay: 'If you put 5 in the group account, what is the ' +
                    'lowest payment you are guaranteed from this round ?',
                lowestPayChoices: [ 5, 7.5, 10, 'Other' ],
                lowestPayCorrect: 1,
                // Guarantee Pay.
                guaranteePay: 'If you put 5 in the group account, and all ' +
                    'others do the same, how much are you guaranteed from ' +
                    'this round ?',
                guranteePayChoices: [ 7.5, 15, 20, 'Other' ],
                guaranteePayCorrect: 1,
                // Likelyness.
                likely: 'Are you more likely to be matched in a group with ' +
                    'other high-contributers if you also put in a large ' +
                    'amount than if you put in only a small amount ?',
                likelyChoices: [
                    'Yes', 'No', 'Other',
                    [ 'true if&lt;5, false if&gt;5', '5' ]
                ],
                likelyCorrect: 0
            };
        },
        cb: function() {
            var w, qs, t;
            t = this.settings.treatmentName;
            qs = this.quizStuff;

            /////////////////////////////////////////////////////////////
            // nodeGame hint: the widget collection
            //
            // Widgets are re-usable components with predefined methods,
            // such as: hide, highlight, disable, getValues, etc.
            // Here we use the `ChoiceManager` widget to create a quiz page.
            w = node.widgets;
            this.quiz = w.append('ChoiceManager', W.getElementById('root'), {
                id: 'quizzes',
                title: false,
                forms: [
                    w.get('ChoiceTable', {
                        id: 'coinsEveryRound',
                        shuffleChoices: true,
                        title: false,
                        choices: qs.coinsChoices,
                        correctChoice: qs.coinsCorrect,
                        mainText: qs.coins
                    }),
                    w.get('ChoiceTable', {
                        id: 'lowestPayment',
                        shuffleChoices: true,
                        title: false,
                        choices: qs.lowestPayChoices,
                        correctChoice: qs.lowestPayCorrect,
                        mainText: qs.lowestPay
                    }),
                    w.get('ChoiceTable', {
                        id: 'leastGuarantee',
                        shuffleChoices: true,
                        title: false,
                        choices: qs.guranteePayChoices,
                        correctChoice: qs.guaranteePayCorrect,
                        mainText: qs.guaranteePay
                    }),
                    w.get('ChoiceTable', {
                        id: 'likeliness',
                        shuffleChoices: true,
                        title: false,
                        choices: qs.likelyChoices,
                        correctChoice: qs.likelyCorrect,
                        mainText: qs.likely
                    })
                ]
            });
        },
        done: function() {
            var answers, isTimeup;
            answers = this.quiz.getValues({
                markAttempt: true,
                highlight: true
            });
            isTimeup = node.game.timer.isTimeup();
            if (!answers.isCorrect && !isTimeup) return false;
            return answers;
        }
    });

    stager.extendStep('bid', {
        frame: 'bidder.html',
        cb: function() {
            // Show summary previous round.
            node.game.displaySummaryPrevRound();

            // Clear previous errors.
            W.setInnerHTML('divErrors', '');
            // Clear contribution inputs.
            W.getElementById('contribution').value = '';
			//Clear lie inputs
			W.getElementById('lienumber').value = '';

            console.log('Meritocracy: bid page.');
        },
        timeup: function() {
            var validation;
            console.log('TIMEUP !');
            validation = node.game.checkInputs();
            node.game.correctInputs(validation);
            node.done();
        },
 /*       done: function() {
            var validation, bid;
            validation = node.game.checkInputs();
            if (!validation) return false;
            bid = node.game.correctInputs(validation);

            // Store reference to old bid.
            node.game.oldContrib = bid;

            return {
                key: 'bid',
                contribution: bid
				lienumber: lie
            };                      
        }*/
		    done: function() {
            var validation, bid, lie, version;
            validation = node.game.checkInputs();
            if (!validation) return false;

            bid = node.game.correctInputs(validation);

            // Get the lie from the page, for example as:
            lie = W.getElementById('lienumber').value;
            // or you modify checkInputs and correctInputs to return an object.
            //inputs = node.game.correctInputs(validation);
            //lie = inputs.lie;
            //bid = inputs.bid;
			
			version = 'twentyfivepercentcoins'

            // Store reference to old bid.
            node.game.oldContrib = bid;
            node.game.oldLie = lie;
			
										console.log(node.game.memory);
				console.log('HELLO');	

            return {
                key: 'bid',
                contribution: bid,
				lienumber: lie,
				version: version
            };  		
        }
    }); 

    stager.extendStep('results', {
        frame: 'results_lie.html',
        cb: function () {
            node.on.data('results', function(msg) {
                console.log('Received results.');
				//console.log(msg.data)
                node.game.updateResults(msg.data);
            });
        }                   
    });

    stager.extendStep('questionnaire', {
        frame: 'postgame.html',
        widget: {
            name: 'ChoiceManager',
            root: 'root',
            options: {
                id: 'questionnaire',
                title: false,
                forms:  [
                    {
                        name: 'ChoiceTable',
                        id: 'alreadyParticipated',
                        choices: [ 'Yes', 'No' ],
                        requiredChoice: true,
                        title: false,
                        mainText: 'Have you participated in other ' +
                            'social experiments before ?'
                    },
                    {
                        name: 'ChoiceTable',
                        id: 'strategy',
                        choices: [
                            [ 'random', 'Randomly chose numbers' ],
                            [ 'egoist', 'Maximized my own personal payoff' ],
                            [ 'team', 'Maximized group payoff' ],
                            [ 'other', 'Other (please described below)' ]
                        ],
                        title: false,
                        orientation: 'v',
                        requiredChoice: true,
                        mainText: 'Describe the strategy you played:'
                    }
                ],
                freeText: 'Leave here any feedback for the experimenter'
            }
        }
    });


    stager.extendStep('end', {
        frame: 'ended.html',
        cb: function() {
            node.on.data('WIN', function(msg) {
                var win, exitcode, codeErr;
                codeErr = 'ERROR (code not found)';
                win = msg.data && msg.data.win || 0;
                exitcode = msg.data && msg.data.exitcode || codeErr;
                W.setInnerHTML('bonus', 'Your bonus in this game is: ' + win);
                W.setInnerHTML('exit', 'Your exitcode is: ' + exitcode);
            });           
            console.log('Game ended');
        }
    });

    game = setup;
    // We serialize the game sequence before sending it.
    game.plot = stager.getState();

    return game;

};
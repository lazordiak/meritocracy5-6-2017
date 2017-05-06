/**
 * # Logic code for Meritocracy Game
 * Copyright(c) 2017 Stefano Balietti
 * MIT Licensed
 *
 * http://www.nodegame.org
 * ---
 */

var path = require('path');
var fs   = require('fs-extra');

var Database = require('nodegame-db').Database;

var ngc = require('nodegame-client');
var Stager = ngc.Stager;
var stepRules = ngc.stepRules;
var GameStage = ngc.GameStage;
var J = ngc.JSUS;


module.exports = function(treatmentName, settings, stager, setup, gameRoom) {

    var channel = gameRoom.channel;
    var node = gameRoom.node;

    var EXCHANGE_RATE = settings.EXCHANGE_RATE;

    // Variable registered outside of the export function are shared among all
    // instances of game logics.
    var counter = settings.SESSION_ID;

    // Group names.
    var groupNames = settings.GROUP_NAMES;

    var DUMP_DIR, DUMP_DIR_JSON, DUMP_DIR_CSV;
    var ngdb, mdb;
    
    var client;
    var nbRequiredPlayers;

    var includes;
    
    // Preparing storage: FILE or MONGODB.
    if (settings.DB === 'FILE') {
        DUMP_DIR = channel.getGameDir() + '/data/' + counter + '/';
        DUMP_DIR_JSON = DUMP_DIR + 'json/';
        DUMP_DIR_CSV = DUMP_DIR + 'csv/';

        // Recursively create directories..       
        fs.mkdirsSync(DUMP_DIR_JSON);
        fs.mkdirsSync(DUMP_DIR_CSV);
    }
    else {
        
        ngdb = new Database(node);
        mdb = ngdb.getLayer('MongoDB', {
            dbName: 'meritocracy_db',
            collectionName: 'user_data'
        });

        mdb.connect(function() {});

        node.on.data('questionnaire', function(msg) {
            var saveObject = {
                session: node.nodename,
                condition: treatmentName,
                stage: msg.stage,
                player: msg.from,
                created: msg.created,
                gameName: msg.data.gameName,
                additionalComments: msg.data.comments,
                alreadyParticipated: msg.data.socExp,
                strategyChoice: msg.data.stratChoice,
                strategyComments: msg.data.stratComment
            };
            mdb.store(saveObject);
        });

        node.on.data('QUIZ', function(msg) {
            var saveObject = {
                session: node.nodename,
                condition: treatmentName,
                stage: msg.stage,
                player: msg.from,
                created: msg.created,
                quiz: msg.data
            };
            mdb.store(saveObject);
        });

        node.game.savePlayerValues = function(p, payoff, positionInNoisyRank,
                                              ranking, noisyRanking,
                                              groupStats,
                                              currentStage) {

            var noisyContribution, finalGroupStats;

            noisyContribution = 'undefined' === typeof p.noisyContribution ?
                'NA' : p.noiseContribution;

            finalGroupStats = groupStats[groupNames[positionInNoisyRank[0]]];

            mdb.store({
                session: node.nodename,
                condition: treatmentName,
                stage: currentStage,
                player: p.player,
                group: p.group,
                contribution: p.contribution,
                //noisyContribution: noisyContribution,
                payoff: payoff,
                //groupAvgContr: finalGroupStats.avgContr,
                //groupStdContr: finalGroupStats.stdContr,
                //rankBeforeNoise: ranking.indexOf(p.id) + 1,
                //rankAfterNoise: noisyRanking.indexOf(p.id) + 1,
                timeup: p.isTimeOut
            });
        };

        node.game.saveRoundResults = function(ranking, groupStats,
                                              noisyRanking, noisyGroupStats) {
            mdb.store({
                session: node.nodename,
                condition: treatmentName,
                ranking: ranking,
                //noisyRanking: noisyRanking,
                //groupAverages: groupStats,
                //noisyGroupAverages: noisyGroupStats
            });
        };
    }

    
    // Outgoing messages will be saved.
    node.socket.journalOn = true;

    // Players required to be connected at the same (NOT USED).
    nbRequiredPlayers = gameRoom.runtimeConf.MIN_PLAYERS;

    // Require logic callbacks file.
    includes = channel.require(__dirname + '/includes/logic.callbacks.js', {
        node: node,
        settings: settings
    }, true);

    // Event handler registered in the init function are always valid.
    stager.setOnInit(function() {
        console.log('********************** meritocracy room ' + counter++);

        // Players that disconnected temporarily.
        node.game.disconnected = {};

        // "STEPPING" is the last event emitted before the stage is updated.
        node.on('STEPPING', function() {
            var currentStage, db, file;

            currentStage = node.game.getCurrentGameStage();

            if (settings.DB === 'FILE') {
                // We do not save stage 0.0.0. 
                // Morever, If the last stage is equal to the current one,
                // we are re-playing the same stage cause of a reconnection.
                // In this case we do not update the database, or save files.
                if (!GameStage.compare(currentStage, new GameStage())) {
                    return;
                }
                // Update last stage reference.
                node.game.lastStage = currentStage;
                
                db = node.game.memory.stage[currentStage];
                
                if (db && db.size()) {
                    try {
                        file = DUMP_DIR + 'memory_' + currentStage;
                        
                        // Saving results to FS.
                        db.save(file + '.csv', { flags: 'w' });
                        db.save(file + '.json');        
                        
                        console.log('Round data saved ', currentStage);
                    }
                    catch(e) {
                        console.log('OH! An error occurred while saving: ',
                                    currentStage, ' ', e);
                    }
                }
            }
            
            console.log(node.nodename, ' - Round:  ', currentStage);
        });

        // Add session name to data in DB.
        node.game.memory.on('insert', function(o) {
            o.session = node.nodename;
        });

    });

    // Extends Stages and Steps where needed.

    stager.extendStep('results', {
        cb: includes.sendResults        
    });
    
    stager.extendStep('end', {
        cb: function() {
            var code, exitcode, accesscode;
            var bonusFile, bonus, csvString;

            console.log('endgame');
            
            bonusFile = DUMP_DIR + 'bonus.csv';

            console.log('FINAL PAYOFF PER PLAYER');
            console.log('***********************');

            bonus = node.game.pl.map(function(p) {
                code = channel.registry.getClient(p.id);
                if (!code) {
                    console.log('ERROR: no code in endgame:', p.id);
                    return ['NA', 'NA'];
                }

                accesscode = code.AccessCode;
                exitcode = code.ExitCode;

                code.win =  Number((code.win || 0) / EXCHANGE_RATE).toFixed(2);
                code.win = parseFloat(code.win, 10);
                
                channel.registry.checkOut(p.id);
                
                node.say('WIN', p.id, {
                    win: code.win,
                    exitcode: code.ExitCode
                });

                console.log(p.id, ': ',  code.win, code.ExitCode);

                return [
                    p.AccessCode || p.id,
                    code.ExitCode || 'NA',
                    code.HITId || 'NA',
                    code.AssignmentId || 'NA',
                    code.win,
                    "x"
                ];
            });
	    
            console.log('***********************');
            console.log('Game ended');

            bonus = [["access", "exit", "WorkerId", "hid", "AssignmentId",
                      "bonus", "Approve", "Reject"]].concat(bonus);

            csvString = bonus.join("\r\n");
            fs.writeFile(bonusFile, csvString, function(err) {
                if (err) {
                    console.log('ERROR: could not save the bonus file: ', 
                                DUMP_DIR + 'bonus.csv');
                    console.log(err);
                }
		console.log('WE GOT HERE')
            });
        }
    });

    return {
        nodename: 'lgc' + counter,
        plot: stager.getState()
    };

};
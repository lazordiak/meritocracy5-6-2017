/**
 * # Authorization settings
 * Copyright(c) 2015 Stefano Balietti <futur.dorko@gmail.com>
 * MIT Licensed
 *
 * http://www.nodegame.org
 * ---
 */
module.exports = {

    // If authorization is enabled clients must use a valid code,
    // as exported by the codes property here, to be allowed to
    // load resources from the server.
    enabled: false, //  [true, false] Default: TRUE.

    // Option specifying how to load the codes.
    mode: 'auto', // ['auto'] Default: 'auto'

    // Codes file. Must export a function that returns an array of codes
    // synchronously or asynchronously. Default file: 'auth.codes.js'
    codes: 'auth.codes.js',

    // Future option. Not available now. Path to login page in `public/`
    page: 'login.htm',

// stuff for mturk
	
	// Remote clients will be able to claim an id via GET request
// from the task description page.
claimId: true,

// Validates incoming requests.
claimIdValidateRequest: function(query, headers) {
    if ('string' !== typeof query.a || query.a === '') {
        return 'missing or invalid AssignmentId';
    }
    if ('string' !== typeof query.h || query.h === '') {
        return 'missing or invalid HITId';
    }
    return true;
},

// Stores information about worker in the database.
claimIdPostProcess: function(code, query, headers) {
    code.WorkerId = query.id;
    code.AssignmentId = query.a;
    code.HITId = query.h;
}

};

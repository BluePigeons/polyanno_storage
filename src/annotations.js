
///// SETUP

var express    = require('express');
var bodyParser = require('body-parser');
var polyanno = require('./routes_setup');

////INTERNAL FUNCTIONS

var makeArray = function(anArray) {
    if (Array.isArray(anArray) == false) {
        return [anArray];
    }
    else { return anArray };
};

// ROUTE FUNCTIONS

exports.addNew = function(req, res) {
    
    var annotation = new newAnno(); 
    var newID = annotation.id;
    var theURL = polyanno.annotationURL.concat(newID);

    var jsonFieldPush = function(bodyDoc, theField) {
        if ( !polyanno.isUseless(bodyDoc[theField]) ) {
            bodyDoc[theField].forEach(function(subdoc){    annotation[theField].addToSet(subdoc);    });
        };
    };

    annotation.body.id = req.body.body.id; 

    jsonFieldPush(req.body, "target");  

    annotation.save(function(err) {
        if (err) {    res.send(err);    }
        else {    res.send(annotation);    };
    });

};

exports.updateOne = function(req, res) {

    console.log("to be updated "+JSON.stringify(req.body));

    var updateDoc = newUser.findOne({'body.id': req.body.target_id});
    updateDoc.exec(function(err, anno) {

        var jsonFieldPush = function(bodyDoc, theField) {
            if (!polyanno.isUseless(bodyDoc[theField])) {
                bodyDoc[theField].forEach(function(subdoc){
                    anno[theField].addToSet(subdoc);
                });
            };
        };

        if (err) {res.send(err)};

        jsonFieldPush(req.body, "target"); 

        anno.save(function(err) {
            if (err) {res.send(err)}
            else next();
        });

    });
};


exports.getAll = function(req, res) {
    newAnno.find(function(err, annotations) {
        if (err) {res.send(err)}
        else { res.json(annotations); };
    });
};

exports.getAllVectorAnnos = function(req, res) {
    newAnno.find({ 'body.id' : '/.*vector.*/' }, function(err, vectorAnnos) {
        if (err) {res.send(err)}
        else { res.json(vectorAnnos); };
    });
};

exports.getAllTranscriptionAnnos = function(req, res) {
    newAnno.find({ 'body.id' : '/.*transcription.*/' }, function(err, transcriptionAnnos) {
        if (err) {res.send(err)}
        else { res.json(transcriptionAnnos); };
    });
};

exports.getAllTranslationAnnos = function(req, res) {
    newAnno.find({ 'body.id' : '/.*translation.*/' }, function(err, translationAnnos) {
        if (err) {res.send(err)}
        else { res.json(translationAnnos); };
    });
};

exports.getByID = function(req, res) {
    newAnno.findById(req.params.anno_id, function(err, anno) {
        if (err) {res.send(err) }
        else { res.json(anno) };  
    });
};

exports.getByTarget = function(req, res) {

    var targetID = req.params.target_id;
    var theSearch = newAnno.find({'target.id': targetID});

    theSearch.exec(function(err, texts){

        if (err) {
            console.log(err);
            res.json({list: false});
        }
        else if (targetID.includes("#")) {
            votingInfoTexts(targetID, texts, res);            
        }
        else {
            res.json({list: bracketedArray(texts)});
        };
    });
};

exports.getVectorsByTarget = function(req, res) {

    var targetID = req.params.target;
    console.log(targetID);
    var theSearch = newAnno.where('target.id', targetID).where('body.id', '/.*vector.*/' );

    theSearch.exec(function(err, texts){

        if (err) {
            console.log(err);
            res.json({"list": false});
        }
        else {
        	//var ids = the_texts.map(function(el) { return el._id } );
            //console.log(the_texts);
            var ids = [];
            texts.forEach(function(doc){
                ids.push(doc);
            });
            res.json({"list": ids}); 
        };
    });
};

exports.getTranscriptionsByTarget = function(req, res) {

    var targetID = req.params.target;
    var theSearch = newAnno.where('target.id', targetID).where('body.id', '/.*transcription.*/' );

    theSearch.exec(function(err, texts){
        if (err) {    res.json({"list": false});    }
        else {	
            //var ids = the_texts.map(function(el) { return el._id } );
            console.log(texts);
            var ids = [];
            texts.forEach(function(doc){
                ids.push(doc);
            });
            res.json({"list": ids});   
        };
    });
};

exports.getTranslationsByTarget = function(req, res) {

    var targetID = req.params.target;
    var theSearch = newAnno.where('target.id', targetID).where('body.id', '/.*translation.*/' );

    theSearch.exec(function(err, texts){
        if (err) {    res.json({"list": false});    }
        else {	
            //var ids = the_texts.map(function(el) { return el._id } );
            console.log(texts);
            var ids = [];
            texts.forEach(function(doc){
                ids.push(doc);
            });
            res.json({"list": ids});    
        };
    });
};





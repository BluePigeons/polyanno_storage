// SETUP

var express    = require('express');
var bodyParser = require('body-parser');
var polyanno = require('./routes_setup');

//ROUTE FUNCTIONS

exports.findAll = function(req, res) {
      
    polyanno.vector_model.find(function(err, vectors) {
        if (err) {res.send(err)};
        res.json(vectors);
    }); 
};

exports.deleteAll = function(req, res) {
      
    polyanno.vector_model.find(function(err, vectors) {
        if (err) {res.send(err)};

        vectors.forEach(function(vector){
            polyanno.vector_model.remove({_id: vector._id},
            function(err){
                if (err) {res.send(err)};
            })
        });

        res.send("all gone");
    }); 
};

exports.addNew = function(req, res) {
    
    var vector = new polyanno.vector_model(); 

    var jsonFieldPush = function(bodyDoc, theField) {
        if ( !polyanno.isUseless(bodyDoc[theField])) {
            bodyDoc[theField].forEach(function(subdoc){    vector[theField].addToSet(subdoc);    });
        };
    };

    ////Coordinates
    ATCarray = 0;
    req.body.geometry.coordinates[0].forEach(function(coordinatesPair){
        vector.notFeature.notGeometry.notCoordinates.push([]);
        var coordsNumbers = [];
        coordinatesPair.forEach(function(number){
            converted = Number(number);
            coordsNumbers.push(converted);
        });
        vector.notFeature.notGeometry.notCoordinates[ATCarray] = coordsNumbers;
        ATCarray += 1;      
    });

    var theCoordinates = vector.notFeature.notGeometry.notCoordinates;
    var polyanno.vector_modelURL = polyanno.vectorURL.concat(vector.id);

    vector.id = polyanno.vector_modelURL;
    jsonFieldPush(req.body, "metadata");
    vector.parent = polyanno.jsonFieldEqual(vector.parent, req.body, "parent");
    vector.translation = polyanno.jsonFieldEqual(vector.translation, req.body, "translation");
    vector.transcription = polyanno.jsonFieldEqual(vector.transcription, req.body, "transcription");

    vector.save(function(err, vector) {
        if (err) {
            console.log(err);
            res.send(err)
        }
        else {
            res.json({ "url": polyanno.vector_modelURL})
        };
    });

};

exports.getByID = function(req, res) {
    polyanno.vector_model.findById(req.params.vector_id).lean().exec( function(err, vector) {
        if (err)
            res.send(err);      

        res.json(vector);
        
    });

};

exports.updateOne = function(req, res) {

    var newInfo = req.body;

    console.dir(newInfo);

    var updateDoc = polyanno.vector_model.findById(req.params.vector_id); 
    updateDoc.exec(function(err, vector) {
        if (err) {res.send(err)};

        if (typeof newInfo.target != 'undefined' || newInfo.target != null) {

            vector.target.push({
                "id": req.body.target.id,
                "language": req.body.target.language,
                "format": req.body.target.format
            });

        };
        if (typeof newInfo.transcription != 'undefined' || newInfo.transcription != null) {
            vector.transcription = req.body.transcription;
        };

        if (typeof newInfo.transcription != 'undefined' || newInfo.transcription != null) {
            vector.translation = req.body.translation;
        };

        if (typeof newInfo.geometry != 'undefined' || newInfo.geometry != null) {
            if (typeof newInfo.geometry.coordinates != 'undefined' || newInfo.geometry.coordinates != null) {

                ATCarray = 0;
                newInfo.geometry.coordinates[0].forEach(function(coordinatesPair){
                    var coordsNumbers = [];
                    coordinatesPair.forEach(function(number){
                        converted = Number(number);
                        coordsNumbers.push(converted);
                    });
                    vector.notFeature.notGeometry.notCoordinates[ATCarray] = coordsNumbers;
                    ATCarray += 1;      
                });
                var theCoordinates = vector.notFeature.notGeometry.notCoordinates;

                //the image fragment is always pushed in after the json target
                var imageID = vector.target[0].id;
                var imageFormats = vector.target[1].format;
                var newIIIFsection = getIIIFsectionURL(imageID, theCoordinates, imageFormats);

                vector.target[1].id = newIIIFsection;
            };
        };

        if (typeof req.body.metadata != 'undefined' || req.body.metadata != null) {
            vector.metadata.push(req.body.metadata);
        };

        if (typeof req.body.children != 'undefined' || req.body.children != null) {
            vector.children.push(req.body.children);
        };

        if (typeof req.body.creator != 'undefined' || req.body.creator != null) {
            vector.creator = req.body.creator;
        };
        
        vector.save(function(err, vector) {
            if (err) {res.send(err)};
            res.json(vector);
        })
    });
};

exports.deleteOne = function(req, res) {
        polyanno.vector_model.remove({
            _id: req.params.vector_id
        }, 
        function(err, vector) {
            if (err)
                res.send(err);

            res.json({ message: 'Successfully deleted' });
        });
};

exports.searchByIds = function(req, res) {
    var otherSearch = polyanno.vector_model.where('id').in(req.params._ids);
    otherSearch.exec(function(err, texts){

        if (err) {
            console.log(err);
            return ({list: false});
        }
        else {
            return ({list: texts});
        };
    });
};
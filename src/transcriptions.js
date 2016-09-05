// SETUP

var express    = require('express');
var bodyParser = require('body-parser');
var polyanno = require('./routes_setup');

//ROUTE FUNCTIONS

var replaceChildText = function(oldText, spanID, newInsert, oldInsert) {
    var idIndex = oldText.indexOf(spanID);
    var startIndex = oldText.indexOf(oldInsert, idIndex);
    var startHTML = oldText.slice(0, startIndex);
    var EndIndex = startIndex + oldInsert.length;
    var endHTML = oldText.substring(EndIndex);
    var newText = startHTML + newInsert+ endHTML;
    return newText;
};

exports.voting = function(req, res) {

    var voteOn = polyanno.transcription_model.findOne({'body.id':req.body.parent});
    voteOn.exec(function(err, transcription) {

        if (err) {res.send(err)};

        ///////ARRAY LOCATION FUNCTIONS

        var findLocationIndex = function(loc) {    
            return transcription.children.indexOf(loc);    
        };

        var theLocation = polyanno.fieldMatching(transcription.children, "id", req.body.children[0].id);
        var thelocationIndex = findLocationIndex(theLocation);

        var findFragmentIndex = function(thefrag) {
            return theLocation.fragments.indexOf(thefrag); 
        };

        var theChildDoc =  polyanno.fieldMatching(transcription.children[thelocationIndex].fragments, "id", req.body.children[0].fragments[0].id);
        var thefragmentIndex = findFragmentIndex(theChildDoc); 

        var fragmentChild = function(nIndex) {
            return transcription.children[thelocationIndex].fragments[nIndex];
        };

        var fragmentChildByRank = function(therank) {
            return polyanno.fieldMatching(transcription.children[thelocationIndex].fragments, "rank", therank);
        };

        ///////VOTE AND RANK FUNCTIONS

        var rankChange = function(indexNumber, rankChangeNumber) {
            return transcription.children[thelocationIndex].fragments[indexNumber].rank += rankChangeNumber;
        };

        var reload = function(newChildRank) {   //check to see if now highest ranking child and update the main transcription if so
            if (newChildRank == 0){ 
                transcription.body.text = replaceChildText(transcription.body.text, req.body.children[0].id, req.body.votedText, req.body.topText);
                return {"reloadText": true};
            }
            else {
                return {"reloadText": false};
            };
        };
/*
        var reorderByRank = function(voteIndex, nIndex) {
            var neigbourFrag = fragmentChild(nIndex);
            var voteFrag = theChildDoc;

            transcription.children[thelocationIndex].fragments.set(nIndex, voteFrag); //put the voted fragment in the neighbour's index
            transcription.children[thelocationIndex].fragments.set(voteIndex, neighbourFrag); //put the neighbour fragment in the old voted fragment's index

            if ((transcription.children[thelocationIndex].fragments[nIndex] == voteFrag) &&(transcription.children[thelocationIndex].fragments[voteIndex] == neighbourFrag)) {
                return transcription; ///only return once process is done
            };
        };
*/

        var votingUpNow = function(theNeighbourIndex) {
            rankChange(theNeighbourIndex, 1);
            rankChange(thefragmentIndex, -1);
            return true;
        };
        var votingDownNow = function(theNeighbourIndex) {
            rankChange(theNeighbourIndex, -1);
            rankChange(thefragmentIndex, 1);    
            return true;            
        };

        var voteRankChange = function(voteNumber) {
        ///NOTE: the ranking is ONLY changed if the vote is now above or below the neighbour, not if now equal
            var neighbourRank =  theChildDoc.rank - voteNumber; 
            var theNeighbour = fragmentChildByRank(neighbourRank); 
           
            if ( (neighbourRank >= 0) && (theChildDoc.rank > neighbourRank) && ( theChildDoc.votesUp > theNeighbour.votesUp ) ) {
                return votingUpNow( findFragmentIndex(theNeighbour) );
            }
            else if ( ( !polyanno.isUseless(fragmentChildByRank(neighbourRank)) ) && (  theChildDoc.rank < neighbourRank  ) &&  (   theChildDoc.votesUp < theNeighbour.votesUp ) ) {
                return votingDownNow( findFragmentIndex(theNeighbour) );               
            }
            else {
                return false;
            };
        };

        var rankChangeLoopCheck = function(voteNumber) {
            var shouldReload = voteRankChange(voteNumber);
            if (shouldReload == false) {
                return {"reloadText": false};
            }
            else {
                do {    shouldReload = voteRankChange(voteNumber);    }
                while ( shouldReload != false );
                if ( shouldReload == false ) { reload(transcription.children[thelocationIndex].fragments[thefragmentIndex].rank) }; ///fragindex() 
            };
        };

        var voteCheckChange = function(voteType) {
            if (voteType == "up") {
                transcription.children[thelocationIndex].fragments[thefragmentIndex].votesUp += 1 ; ///make into Promise setup??
                return voteRankChange(1); //reload(newChildRank); 
            }
            else if (voteType == "down") {
                transcription.children[thelocationIndex].fragments[thefragmentIndex].votesUp -= 1 ; 
                return voteRankChange(-1);
            };
        };

        //Node is synchronous so this ensures that nothing is saved until whole process is done without Promises
        var savingFunction = function(theNewVotes) {
            transcription.save(function(err) {
                if (err) {res.send(err)}
                else {  
                    res.json(theNewVotes);  
                };
            });
        };

        ///////START VOTING FUNCTIONS & SAVE

        var updateVotes = voteCheckChange(req.params.voteType);
        savingFunction(updateVotes);

    });
};

exports.findAll = function(req, res) {
    polyanno.transcription_model.find(function(err, transcriptions) {
        if (err) {res.send(err)}
        else { res.json(transcriptions); };
    });
};

exports.deleteAll = function(req, res) {
      
    polyanno.transcription_model.find(function(err, transcriptions) {
        if (err) {res.send(err)};

        transcriptions.forEach(function(transcription){
            transcription.remove({_id: transcription._id},
            function(err){
                if (err) {res.send(err)};
            });
        });
        if (transcriptions.length == 0) {
            res.send("all gone");
        };
    }); 
};

var polyanno.jsonFieldEqual = function(docField, bodyDoc, bodyField) {
    if (!polyanno.isUseless(bodyDoc[bodyField])) {    return bodyDoc[bodyField];    }
    else {    return docField;    };
};

var bodySetting = function(oldBody, reqDoc) {
    if ( (polyanno.isUseless(reqDoc) ) ){    return oldBody;    }
    else {
        var newBody = {};
        newBody.text = polyanno.jsonFieldEqual(oldBody, reqDoc, "text");
        newBody.format = polyanno.jsonFieldEqual(oldBody, reqDoc, "format");
        newBody.language = polyanno.jsonFieldEqual(oldBody, reqDoc, "format");
        return newBody;  
    };
};

var newFragmentObject = function(theID, theRank) {
    return  {
        "id": theID,
        "votesUp": 0,
        "votesDown": 0,
        "rank": theRank
    };
};

var newLocationObject = function(theID, theFragments) {
    return {
        "id": theID,
        "fragments": theFragments
    };
};

var newChildrenLocationArray = function(oldChildren, newChildren) {
    var newFragmentChild = newFragmentObject(newChildren.fragments[0].id, 0);
    var newLocation = newLocationObject(newChildren.id, [ newFragmentChild ] );
    return [-1, newLocation];
};

var newChildrenChecking = function(oldChildren, newChildren) {

    if ( (typeof newChildren == 'undefined' || newChildren == null) || (typeof newChildren[0] == 'undefined' || newChildren[0] == null) ){
        return [-1,-1];
    }
    else {
        return oldChildrenChecking(oldChildren, newChildren[0]);
    };
};

var oldChildrenChecking = function(oldChildren, newChildren) {

    if (typeof oldChildren[0] != 'undefined' || oldChildren[0] != null) {
        return childrenLocationChecking(oldChildren, newChildren);
    }
    else {
        return newChildrenLocationArray(oldChildren, newChildren);
    };
};

var childrenLocationChecking = function(oldChildren, newChildren) {

    var theLocation = polyanno.fieldMatching(oldChildren, "id", newChildren.id);
    if (polyanno.isUseless(theLocation)) {
        return newChildrenLocationArray(oldChildren, newChildren);
    }
    else {
        var thelocationIndex = oldChildren.indexOf(theLocation);
        var newRank = theLocation.fragments.length;
        var newFragmentChild = newFragmentObject(newChildren.fragments[0].id, newRank);
        return [thelocationIndex, newFragmentChild];
    };
};


/////////merge as part of idmatching???
var theIDCheck = function(theArray, doc) {
    if ( typeof polyanno.fieldMatching(theArray, "id", doc.body.id) != ('undefined' || null)) {
        return polyanno.fieldMatching(theArray, "id", doc.body.id); 
    }
    else if ( typeof polyanno.fieldMatching(theArray, "id", doc.id) != ('undefined' || null)) {
        return polyanno.fieldMatching(theArray, "id", doc.id); 
    }
    else {
        return null;
    };           
};

/////should return an array of arrays of matching pairs
var arrayIDCompare = function(arrayA, arrayB) {

    var returnArray =[];
    var i = 0;
    arrayA.forEach(function(doc){
        if (polyanno.isUseless(theIDCheck(arrayB, doc) )) { i += 1; }
        else {
            i += 1;
            returnArray.push([doc, theIDCheck(arrayB, doc)]); ////push a pair of matching docs
        };
    });

    if ( (i == arrayA.length) && ( polyanno.isUseless(returnArray[0]) ) ) {    return null;    }
    else if ( (i == arrayA.length) && (polyanno.isUseless(returnArray[0]) == false ) ) {    return returnArray;    };
};

var foundParent = function(textParent, spanID, textArray) {
    var findSpanLocation = function() {    return polyanno.fieldMatching(textParent.children, "id", spanID);    };
    return arrayIDCompare(textArray, findSpanLocation().fragments);
};

var bracketedArray = function(texts) {

    var theArray = [];
    texts.forEach(function(doc){
        theArray.push([doc]);
    });
    if (theArray.length == texts.length) {
        return theArray;
    };
};

var votingInfoTexts = function(targetID, textArray, res) {

    var parts = targetID.split("#", 2); //////this will work with first two not last two.....
    var parentID = parts[0];
    var spanID = parts[1];
    polyanno.transcription_model.findOne({'id': parentID}, function(err, textParent){
        if (err) { 
            res.json({list: bracketedArray(textArray, res)});
        }
        else {
            var theVoteDocs = foundParent(textParent, spanID, textArray);
            res.json({list: theVoteDocs});
        };
    });
};

/*
var generateVoteJSON = function(fragmentChild, theJSON) {
    ///adds new field before returning
    var voteDoc = {"votingInfo" : fragmentChild};
    var JSONadded =  polyanno.asyncPush([theJSON], []); 
    return polyanno.asyncPush([voteDoc], JSONadded);

};
*/



exports.addNew = function(req, res) {
    
    var transcription = new polyanno.transcription_model(); 

    var jsonFieldPush = function(bodyDoc, theField) {
        if ( !polyanno.isUseless(bodyDoc[theField]) ) {
            bodyDoc[theField].forEach(function(subdoc){    transcription[theField].addToSet(subdoc);    });
        };
    };
    var transURL = polyanno.transcriptionURL.concat(transcription.id);
    transcription.body = bodySetting(transcription.body, req.body.body);   
    transcription.parent = polyanno.jsonFieldEqual(transcription.parent, req.body, "parent");
    transcription.translation = polyanno.jsonFieldEqual(transcription.translation, req.body, "translation");

    jsonFieldPush(req.body, "metadata");

    var newChildrenArray = newChildrenChecking(transcription.children, req.body.children);
    if ( ( !polyanno.isUseless(transcription.children)) && (!polyanno.isUseless(newChildrenArray[0]) )
        && (newChildrenArray[0] != -1) ) {
        transcription.children[newChildrenArray[0]].fragments.addToSet(newChildrenArray[1]);
    }
    else if ( ( !polyanno.isUseless(transcription.children) ) && (!polyanno.isUseless(newChildrenArray[0]) )
        && (newChildrenArray[0] == -1) && (newChildrenArray[1] != -1) ) {
        transcription.children.addToSet(newChildrenArray[1]);
    };

    transcription.save(function(err) {
        if (err) {    res.send(err);    }
        else {    res.json({ "url": transURL });    };
    });

};

exports.getByID = function(req, res) {
    polyanno.transcription_model.findById(req.params.transcription_id, function(err, transcription) {
        if (err) {res.send(err) }
        else { res.json(transcription) };  
    });
};

////IMPORTANT NOTE: use updateOne to add new children but NOT to change vote or rank!

exports.updateOne = function(req, res) {

    console.log("to be updated "+JSON.stringify(req.body));

    var updateDoc = polyanno.transcription_model.findById(req.params.transcription_id);
    updateDoc.exec(function(err, transcription) {

        if (err) {res.send(err)};

        var jsonFieldPush = function(bodyDoc, theField) {
            if (!polyanno.isUseless(bodyDoc[theField])) {
                bodyDoc[theField].forEach(function(subdoc){
                    transcription[theField].addToSet(subdoc);
                });
            };
        };

        transcription.body = bodySetting(transcription.body, req.body.body, transcription.body.id);   
        transcription.parent = polyanno.jsonFieldEqual(transcription.parent, req.body, "parent");
        transcription.translation = polyanno.jsonFieldEqual(transcription.translation, req.body, "translation");
        jsonFieldPush(req.body, "metadata");
        jsonFieldPush(req.body, "target"); 

        var newChildrenArray = newChildrenChecking(transcription.children, req.body.children);
        if ( ( polyanno.isUseless(transcription.children) == false) && (polyanno.isUseless(newChildrenArray[0]) == false )
            && (newChildrenArray[0] != -1) ) {
            transcription.children[newChildrenArray[0]].fragments.addToSet(newChildrenArray[1]);
        }
        else if ( ( polyanno.isUseless(transcription.children) == false) && (polyanno.isUseless(newChildrenArray[0]) == false )
            && (newChildrenArray[0] == -1) && (newChildrenArray[1] != -1) ) {
            transcription.children.addToSet(newChildrenArray[1]);
        };

        transcription.save(function(err) {
            if (err) {res.send(err)}
            else {res.json(transcription)};
        });

    });
};


exports.deleteOne = function(req, res) {
    polyanno.transcription_model.remove({
        _id: req.params.transcription_id
    }, 
    function(err, transcription) {
        if (err)
            res.send(err);
        res.json({ message: 'Successfully deleted' });
    });
};

exports.searchByIds = function(req, res) {
    var otherSearch = polyanno.transcription_model.where('id').in(req.params._ids);
    otherSearch.exec(function(err, texts){

        if (err) {
            console.log(err);
            return ({list: false});
        }
        else if (targetID.includes("#")) {
            return votingInfoTexts(targetID, texts, res);            
        }
        else {
            return ({list: bracketedArray(texts)});
        };
    });
};


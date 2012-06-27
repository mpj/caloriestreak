var key, secret;

if(process.env.NODE_ENV == 'production') {
  key =     'd0e46779f2af43b6a3f17d86c50255ca';
  secret =  '6d3e04826f1845888469dfee4fd145a8';
} else {
  key =     'f5cc57b57ac94d5581f33e937dd9103e';
  secret =  '8d9fb8d44daf4101ac80dbdf51f8b178';
}



var fitbit = require('../lib/fitbit.js')(key, secret)
var async = require('async');

exports.home = function(req, res){
  res.render('home', { title: 'Home' })
};

exports.dashboard = function(req, res){
  fitbit.ensureAuthenticated(req, res, function(err, token) {
    
    if (err) {
      throw err;
      return;
    }

    async.auto({
      
      
      calories: function(cb) { 
        fitbitData(token, 'activities/calories', cb) }, 
      /*
      weight:   function(cb) { 
        fitbitData(token, 'body/log/weight', cb) },
      */
      steps:    function(cb) { 
        fitbitData(token, 'activities/steps', cb) }, 

      render: [ 'calories', /*'weight',*/ 'steps' ,
        function(callback, result) {
        var calories = result.calories;
        
        var total = 0, 
            streak = 0,
            average,
            cals;

        for (var i=0;i<calories.length;i++) {
          cals = parseInt(calories[i].value);

          total += cals;
          average = Math.floor(total/calories.length);

          if (cals > average)
            streak++;
          else
            streak = 0;
        }

        console.log("process.env",process.env)

        res.render('dashboard', { title: 'Dashboard', averageCalories: average, streak: streak})
        }
      ]
    },
    function(err, result) {
      if (err) throw err;
      res.send("OK")
    })
  })
  
};

function currentDateFitbitString() {
  var now = new Date();
  var month = now.getMonth().toString();
  if (month.length == 1) month = "0" + month;
  return now.getFullYear() + '-' +  month + '-' + now.getDate();
}

function fitbitData(token, dataPath, cb) {
  var path = '/user/-/' + dataPath + '/date/'+currentDateFitbitString()+'/max.json';
  callFitbitAPI(token, path, function(err, data) {
    if (err) cb(err)
    else {
      var propName = dataPath.replace('/','-');
      if (propName.indexOf('weight') > -1)
        propName = "weight"; // bullshit case
      cb(null, data[propName]);
    }
  });
}

function callFitbitAPI(token, path, callback) {
  fitbit.get(path, token, function(err, data) {
    if (err) {
      console.warn("Failed connecting to FitBit. Clearing session.", err);
      fitbit.logout(req);
      callback(err, null)
    } else {
      callback(null, data);
    }
  })
}
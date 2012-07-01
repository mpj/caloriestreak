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
      
        /*
      calories: function(cb) { 
        fitbitData(token, 'activities/calories', cb) }, 
    
      weight:   function(cb) { 
        fitbitData(token, 'body/log/weight', cb) },
      */
      steps:    function(cb) { 
        fitbitData(token, 'activities/steps', cb) }, 

      lastSyncDate: function(cb) {
        getDevices(token, function(err, devices) {
          
          if (err) return cb(err);

          var lastSyncTime;
          for(var i=0;i<devices.length;i++) {
            if (devices[i].type === 'TRACKER') {
              lastSyncTime = new Date(devices[i].lastSyncTime);
              break;
            }
          }
          cb(null, lastSyncTime);
        })
      },

      render: [ /*'calories',*/ 'lastSyncDate', /*'weight',*/ 'steps' ,
        function(callback, result) {
          var steps = result.steps;

          var lastValidDay = flatDate(result.lastSyncDate)
          lastValidDay.setDate(lastValidDay.getDate()-1);

          var total = 0, 
              streak = 0,
              average = 0,
              walkingDays = 0,
              cals,
              calDate;

          for (var i=0;i<steps.length;i++) {

            calDate = new Date(steps[i].dateTime);
            
            // Don't count days with incomplete data
            if (flatDate(calDate).getTime() > lastValidDay.getTime())
              break;
           
            stps = parseInt(steps[i].value);

            if (stps === 0) // Dont average in days where we forgot the fitbit at home
              continue;

            console.log("steps", stps)

            walkingDays++;

            if (stps > average)
              streak++;
            else
              streak = 0;

            total += stps;
            average = Math.floor(total/walkingDays);
            
          }

          res.render('dashboard', { title: 'Dashboard', averageSteps: average, streak: streak})
        }
      ]
    },
    function(err, result) {
      if (err)  {
        console.warn("Failed connecting to FitBit. Clearing session.", err);
        fitbit.logout(req);
      } else {
        res.send("OK")
      }
      
    })
  })
  
};

function flatDate(date) {
  var d= new Date(0,0,0,0,0,0,0)
  d.setUTCFullYear(date.getUTCFullYear())
  d.setUTCMonth(date.getUTCMonth())
  d.setUTCDate(date.getUTCDate())
  d.setUTCHours(0)
  d.setUTCMinutes(0)
  d.setUTCSeconds(0)
  d.setUTCMilliseconds(0)
  return d;
}

function currentDateFitbitString() {
  var now = new Date();
  var month = (now.getUTCMonth()+1).toString();
  if (month.length == 1) month = "0" + month;
  return now.getUTCFullYear() + '-' +  month + '-' + now.getUTCDate();
}

function getDevices(token, cb) {
  var path = '/user/-/devices.json';
  callFitbitAPI(token, path, function(err, data) {
    if (err)cb(err)
    else {
      cb(null, data);
    }

  })
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
      callback(err, null)
    } else {
      callback(null, data);
    }
  })
}
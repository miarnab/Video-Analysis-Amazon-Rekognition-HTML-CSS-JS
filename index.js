
// Project Variables
var bucketName = 'YOUR_BUCKET_NAME';
var bucketRegion = 'YOUR_BUCKET_REGION';
var roleArn = 'YOUR_ROLE_ARN';
var snsTopicArn = 'YOUR_SNS_TOPIC_ARN';

// AWS Credentials
AWS.config.update({
    accessKeyId: 'YOUR_ACCESS_KEY', secretAccessKey: 'YOUR_SECRET_KEY', region: 'YOUR_REGION'
  })

//AWS S3 Object Configuration  
var s3 = new AWS.S3({
    apiVersion: "2006-03-01",
    params: { Bucket: bucketName }
});

// AWS Rekognition Object Creation
var rekognition = new AWS.Rekognition();

function viewVideo(videoKey) {
  document.getElementById("video-status").insertAdjacentHTML('afterbegin', "<h3>Loading...</h3>");
  s3.getObject({ Bucket: bucketName,Key: videoKey},function(err,data){
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + bucketName + "/";
    var videoUrl = bucketUrl + encodeURIComponent(videoKey);
    var html = `<video width="320" height="240" controls>
                  <source src="${videoUrl}" type="video/mp4">
                </video>`
    document.getElementById("video-status").remove();
    document.getElementById("video").insertAdjacentHTML('afterbegin', html);

  })
}

function uploadVideo() {
    var files = document.getElementById("videoupload").files;
    if (!files.length) {
        return alert("Please choose a file to upload first.");
    }
    var file = files[0];
    var videoKey = file.name;

    // Use S3 ManagedUpload class as it supports multipart uploads
    var upload = new AWS.S3.ManagedUpload({
        params: {
            Bucket: bucketName,
            Key: videoKey,
            Body: file
        }
    });

    var promise = upload.promise();

    promise.then(
        function (data) {
            alert("Successfully uploaded video.");
            viewVideo(videoKey)
            //processVideo(videoKey)
        },
        function (err) {
            return alert("There was an error uploading your video: ", err.message);
        }
    );
}

function startDetectLabel(){

  var files = document.getElementById("videoupload").files;
    if (!files.length) {
        return alert("Please choose a file to upload first.");
  }
  var file = files[0];
  var videoKey = file.name;

 var clientToken = Date.now().toString();

  var params = {
    Video: { 
      S3Object: {
        Bucket: bucketName,
        Name: videoKey
      }
    },
    ClientRequestToken: clientToken,
    JobTag: 'video',
    MinConfidence: 70,
    NotificationChannel: {
      RoleArn: roleArn, 
      SNSTopicArn: snsTopicArn
    }
  };

  rekognition.startLabelDetection(params, function(err, data) {
    if (err) console.log(err, err.stack); 
    else {
      console.log(data);
      var html = `<h3>Job ID:${data.JobId}</h3>
                  <h3>Status: IN_PROGRESS</h3>
                  <button id="checkresults" onclick="getVideoLabels('${data.JobId}')">Check Results</button><br><hr>`
    document.getElementById("jobid").insertAdjacentHTML('afterend', html);
    }           
  });
}

function getVideoLabels(jobId) {
  var params = {
    JobId: jobId, 
    MaxResults: 1000,
    SortBy: 'TIMESTAMP'
  };
  rekognition.getLabelDetection(params, function(err, data) {
    if (err) console.log(err, err.stack); 
    else {
      console.log(data); 
      var html = ''
      if (data.JobStatus == 'IN_PROGRESS') {
        html = `<h3>Status: IN_PROGRESS</h3><hr>`
      } else {
        //html = JSON.stringify(data)
        
        var table = "<table border=1>";
        table += "<tr><td>#</td><td>Label</td><td>Confidence</td><td>TimeStamp</td></tr>";
        for (var i = 0; i < data.Labels.length; i++) {
          table += "<tr>";
          table += "<td>"  + i + "</td>";
          table += "<td>"  + data.Labels[i].Label.Name + "</td>";
          table += "<td>"  + parseFloat(data.Labels[i].Label.Confidence).toFixed(2) + "</td>"; 
          table += "<td>"  + moment.duration(data.Labels[i].Timestamp, "milliseconds").format("mm:ss:SS", {trim: false})+ "</td>" 
          table += "</tr>";
        }
        table += "</table>"
        html = table;
      }
      document.getElementById("status").insertAdjacentHTML('beforeend', html);
    }               
  });
}

function startDetectFaces(){

  var files = document.getElementById("videoupload").files;
    if (!files.length) {
        return alert("Please choose a file to upload first.");
  }
  var file = files[0];
  var videoKey = file.name;

 var clientToken = Date.now().toString();

  var params = {
    Video: { 
      S3Object: {
        Bucket: bucketName,
        Name: videoKey
      }
    },
    ClientRequestToken: clientToken,
    JobTag: 'video',
    FaceAttributes: 'ALL',
    NotificationChannel: {
      RoleArn: roleArn, 
      SNSTopicArn: snsTopicArn
    }
  };

  rekognition.startFaceDetection(params, function(err, data) {
    if (err) console.log(err, err.stack); 
    else {
      console.log(data);
      var html = `<h3>Job ID:${data.JobId}</h3>
                  <h3>Status: IN_PROGRESS</h3>
                  <button id="checkresults" onclick="getVideoFaces('${data.JobId}')">Check Results</button><br><hr>`
    document.getElementById("jobid").insertAdjacentHTML('afterend', html);
    }           
  });
}

function getVideoFaces(jobId) {
  var params = {
    JobId: jobId, 
    MaxResults: 1000
  };
  rekognition.getFaceDetection(params, function(err, data) {
    if (err) console.log(err, err.stack); 
    else {
      console.log(data); 
      var html = ''
      if (data.JobStatus == 'IN_PROGRESS') {
        html = `<h3>Status: IN_PROGRESS</h3><hr>`
      } else {
        //html = JSON.stringify(data)
        var table = "<table border=1>"
        table += "<tr><td>Age-Low</td><td>Age-High</td><td>Gender</td><td>Emotions</td><td>TimeStamp</td></tr>";
        for (var i=0; i < data.Faces.length; i++) {
         table += "<tr>";
         table += "<td>"+data.Faces[i].Face.AgeRange.Low+"</td>";
         table += "<td>"+data.Faces[i].Face.AgeRange.High+"</td>";
         table += "<td>"+data.Faces[i].Face.Gender.Value+"</td>";
         table += "<td>"+data.Faces[i].Face.Emotions[0].Type+"</td>"; 
         table += "<td>"+moment.duration(data.Faces[i].Timestamp, "milliseconds").format("mm:ss:SS", {trim: false})+ "</td>" 
             
         table += "</tr>"
        }    
        table += "</table>"
        html = table
      }
      document.getElementById("status").insertAdjacentHTML('beforeend', html);
    }               
  });
}

function startDetectCelebrity(){

  var files = document.getElementById("videoupload").files;
    if (!files.length) {
        return alert("Please choose a file to upload first.");
  }
  var file = files[0];
  var videoKey = file.name;

 var clientToken = Date.now().toString();

  var params = {
    Video: { 
      S3Object: {
        Bucket: bucketName,
        Name: videoKey
      }
    },
    ClientRequestToken: clientToken,
    JobTag: 'video',
    NotificationChannel: {
      RoleArn: roleArn, 
      SNSTopicArn: snsTopicArn
    }
  };

  rekognition.startCelebrityRecognition(params, function(err, data) {
    if (err) console.log(err, err.stack); 
    else {
      console.log(data);
      var html = `<h3>Job ID:${data.JobId}</h3>
                  <h3>Status: IN_PROGRESS</h3>
                  <button id="checkresults" onclick="getVideoCelebrity('${data.JobId}')">Check Results</button><br><hr>`
    document.getElementById("jobid").insertAdjacentHTML('afterend', html);
    }           
  });
}

function getVideoCelebrity(jobId) {
  var params = {
    JobId: jobId, 
    MaxResults: 1000
  };
  rekognition.getCelebrityRecognition(params, function(err, data) {
    if (err) console.log(err, err.stack); 
    else {
      console.log(data); 
      var html = ''
      if (data.JobStatus == 'IN_PROGRESS') {
        html = `<h3>Status: IN_PROGRESS</h3><hr>`
      } else {
        //html = JSON.stringify(data)        
        var table = "<table border=1>";
        table += "<tr><td>#</td><td>Name</td><td>Confidence</td><td>IMDB</td><td>TimeStamp</td></tr>";
        for (var i = 0; i < data.Celebrities.length; i++) {
          table += "<tr>";
          table += "<td>"  + i + "</td>";
          table += "<td>"  + data.Celebrities[i].Celebrity.Name + "</td>";
          table += "<td>"  + parseFloat(data.Celebrities[i].Celebrity.Confidence).toFixed(2) + "</td>";
          table += "<td><a href=https://"  + data.Celebrities[i].Celebrity.Urls + " target='_blank'>Open Link </a></td>";
          table += "<td>"  + moment.duration(data.Celebrities[i].Timestamp, "milliseconds").format("mm:ss:SS", {trim: false}); + "</td>"; 
          table += "</tr>";
        }
        table += "</table>"
        html = table
      }
      document.getElementById("status").insertAdjacentHTML('beforeend', html);
    }               
  });
}

function startDetectText(){

  var files = document.getElementById("videoupload").files;
    if (!files.length) {
        return alert("Please choose a file to upload first.");
  }
  var file = files[0];
  var videoKey = file.name;

 var clientToken = Date.now().toString();

  var params = {
    Video: { 
      S3Object: {
        Bucket: bucketName,
        Name: videoKey
      }
    },
    ClientRequestToken: clientToken,
    JobTag: 'video',
    NotificationChannel: {
      RoleArn: roleArn, 
      SNSTopicArn: snsTopicArn 
    }
  };

  rekognition.startTextDetection(params, function(err, data) {
    if (err) console.log(err, err.stack); 
    else {
      console.log(data);
      var html = `<h3>Job ID:${data.JobId}</h3>
                  <h3>Status: IN_PROGRESS</h3>
                  <button id="checkresults" onclick="getVideoText('${data.JobId}')">Check Results</button><br><hr>`
    document.getElementById("jobid").insertAdjacentHTML('afterend', html);
    }           
  });
}

function getVideoText(jobId) {
  var params = {
    JobId: jobId, 
    MaxResults: 1000
  };
  rekognition.getTextDetection(params, function(err, data) {
    if (err) console.log(err, err.stack); 
    else {
      console.log(data); 
      var html = ''
      if (data.JobStatus == 'IN_PROGRESS') {
        html = `<h3>Status: IN_PROGRESS</h3><hr>`
      } else {
        //html = JSON.stringify(data)

        var table = "<table border=1>";
        table += "<tr><td>#</td><td>Text</td><td>Confidence</td><td>Type</td><td>TimeStamp</td></tr>";
        for (var i = 0; i < data.TextDetections.length; i++) {
          table += "<tr>";
          table += "<td>"  + i + "</td>";
          table += "<td>"  + data.TextDetections[i].TextDetection.DetectedText + "</td>";
          table += "<td>"  + parseFloat(data.TextDetections[i].TextDetection.Confidence).toFixed(2) + "</td>";
          table += "<td>"  + data.TextDetections[i].TextDetection.Type + "</td>";
          table += "<td>"  + moment.duration(data.TextDetections[i].Timestamp, "milliseconds").format("mm:ss:SS", {trim: false}); + "</td>"; 
          table += "</tr>";
        }
        table += "</table>"
        html = table
      }
      document.getElementById("status").insertAdjacentHTML('beforeend', html);
    }               
  });
}
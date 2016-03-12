var VPlayer = (function() {
  /**
   * Video player
   */
  var player = document.querySelector('.player');
  var video = document.querySelector('video');
  var controls = document.querySelector('.controls');

  /**
   * Controls → Buttons
   */
  var playButton = document.querySelector('.play');
  var volume = document.querySelector('.volume');
  var fullscreenButton = document.querySelector('.fullscreen');

  /**
   * Controls → Progress bar
   */
  var progress = document.querySelector('.controls .progress');
  var progressPlayed = document.querySelector('.controls .progress .played');
  var progressLoaded = document.querySelector('.controls .progress .loaded');
  var timeCode = document.querySelector('.controls .timecode');
  var timeCodeText = document.querySelector('.controls .timecode span');
  var ghostTimeCode = document.querySelector('.controls .ghost-timecode');
  var ghostTimeCodeText = document.querySelector('.controls .ghost-timecode span');

  /**
   * Events
   */
  video.addEventListener('click', togglePlayPause);
  playButton.addEventListener('click', togglePlayPause);

  volume.addEventListener('click', changeVolume);

  video.addEventListener('dblclick', toggleFullScreen);
  fullscreenButton.addEventListener('click', toggleFullScreen);

  progress.addEventListener('click', onProgressClick);
  progress.addEventListener('mousemove', onProgressMouseOver);
  progress.addEventListener('mouseout', onProgressMouseOut);

  document.addEventListener('mouseup', onProgressDragStop);
  progress.addEventListener('mousedown', onProgressDragStart);

  video.addEventListener('canplay', initializeVideoElements);
  video.addEventListener('timeupdate', updateProgressPlayed);
  video.addEventListener('progress', updateProgressBuffered);

  player.addEventListener('mouseout', hideControls);
  player.addEventListener('mousemove', showControls);
  player.addEventListener('mousemove', debounce(hideControls, 2000));

  /**
   * Event handlers
   */
  function initializeVideoElements() {
    // Set ARIA accessibility attributes
    progressPlayed.setAttribute('aria-valuemin', 0);
    progressPlayed.setAttribute('aria-valuemax', video.duration);
    progressLoaded.setAttribute('aria-valuemin', 0);
    progressLoaded.setAttribute('aria-valuemax', video.duration);

    // Get total video duration in hh:mm:ss format
    var totalFormattedTime = secondsToHms(video.duration);

    // Fade in tooltip with total video duration
    timeCode.style.opacity = 1;
    timeCodeText.innerHTML = totalFormattedTime;

    // Fade in video controls
    showControls();
  }

  function hideControls() {
    // Hide controls only after video has initiated a playback
    if (video.played.length > 0) {
      controls.style.opacity = 0;
    }
  }

  function showControls() {
    controls.style.opacity = 1;
  }

  function play() {
    video.play();
    playButton.classList.remove('paused');
    playButton.classList.add('playing');
  }

  function pause() {
    video.pause();
    playButton.classList.remove('playing');
    playButton.classList.add('paused');
  }

  function togglePlayPause() {
    if (video.paused) {
      play();
    } else {
      pause();
    }
  }

  function changeVolume(event) {
    var TOTAL_BAR_WIDTH = 4.8;
    var TOTAL_BARS = 5;

    // Get first volume bar
    var volumeBar = volume.firstElementChild;

    // Returns the size of an element and its position relative to the viewport
    var rect = volume.getBoundingClientRect();

    // Returns mouse cursor position in pixels relative to the volume control
    var relX = event.pageX - (rect.left + document.body.scrollLeft);

    // Keep track of how far it's "scanned" volume control, incrementing by 4.8 in each loop iteration
    // Each bar is 3px (plus 1.8px for spacing)
    // Total volume control width is 24px
    var position = 0;

    for (var i = 0; i < TOTAL_BARS; i++) {
      if (volumeBar) {
        // Keep volume bars before mouse cursor as-is (blue color)
        if (relX > position) {
          // Clean up previous classes
          volumeBar.classList.remove('fill-0', 'fill-1', 'fill-2');

          // Handle partial volume bar fills
          // The outer if-condition makes sure it applies partial fill to the correct bar
          // It defaults to 0 since first bar will have `relX` less than the total bar width
          var order = relX > TOTAL_BAR_WIDTH ? Math.floor(relX / TOTAL_BAR_WIDTH) : 0;
          if (order === i) {
            // This condition is more lenient than the second because it is more visually pleasing
            // to have a small partial fill for a greater range of values between 0 and 1
            // Defaults to `TOTAL_BAR_WIDTH` since `position` is initially 0, which will result in NaN value
            var remainder = relX % (position || TOTAL_BAR_WIDTH);
            if (remainder > 0 && Math.floor(remainder) <= 1) {
              volumeBar.classList.add('fill-1');
            } else if (Math.floor(remainder) === 2) {
              volumeBar.classList.add('fill-2');
            }
          }
        } else {
          // Grey-out volume bars after mouse cursor
          volumeBar.classList.add('fill-0');
        }

        // Go to next volume bar
        volumeBar = volumeBar.nextElementSibling;
      }

      // Increment by bar width (3px) + spacing (1.8px)
      position += TOTAL_BAR_WIDTH;
    }

    // Set ARIA accessibility attributes
    volume.setAttribute('aria-valuenow', parseFloat(relX / volume.offsetWidth).toFixed(2));
    volume.setAttribute('aria-valuetext', Math.round((relX / volume.offsetWidth) * 100) + '%');

    // Update the actual video volume
    video.volume = relX / volume.offsetWidth;
  }

  function toggleFullScreen() {
    // Enter fullscreen
    if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      } else if (video.mozRequestFullScreen) {
        video.mozRequestFullScreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen(video.ALLOW_KEYBOARD_INPUT);
      }
      fullscreenButton.classList.add('is-fullscreen');
    } else {
      // Exit fullscreen
      if (video.exitFullscreen) {
        video.exitFullscreen();
      } else if (video.msExitFullscreen) {
        video.msExitFullscreen();
      } else if (video.mozCancelFullScreen) {
        video.mozCancelFullScreen();
      } else if (video.webkitExitFullscreen) {
        video.webkitExitFullscreen();
      }
      fullscreenButton.classList.remove('is-fullscreen');
    }
  }

  function updateProgressPlayed() {
    // Set ARIA accessibility attributes
    progressPlayed.setAttribute('aria-valuenow', video.currentTime);

    // Returns current time in percentage
    var playedPercent = (video.currentTime / video.duration) * 100;

    // Update played progress
    progressPlayed.style.width = playedPercent + '%';

    // Calculate current time using "hh:mm:ss" format
    var relFormattedTime = secondsToHms(video.currentTime);

    // Update timestamp relative to played progress
    timeCode.style.left = playedPercent + '%';
    timeCodeText.innerHTML = relFormattedTime;
  }

  function onProgressMouseOver(event) {
    // Returns the size of an element and its position relative to the viewport
    var rect = progress.getBoundingClientRect();

    // Returns mouse cursor position in pixels relative to the progress bar element
    var relX = event.pageX - (rect.left + document.body.scrollLeft);

    // Returns mouse cursor position in percentage relative to the progress bar element
    var relXPercent = (relX / progress.offsetWidth) * 100;

    // Calculate video duration relative to mouse cursor using "hh:mm:ss" format
    var relFormattedTime = secondsToHms((video.duration * relXPercent) / 100);

    // Display tooltip with timestamp relative to mouse cursor
    ghostTimeCode.style.opacity = 1;
    ghostTimeCode.style.left = relXPercent + '%';
    ghostTimeCodeText.innerHTML = relFormattedTime;
  }

  function onProgressMouseOut() {
    // Hide tooltip with timestamp relative to mouse cursor
    ghostTimeCode.style.opacity = 0;
  }

  function onProgressClick() {
    // Returns the size of an element and its position relative to the viewport
    var rect = progress.getBoundingClientRect();

    // Returns mouse cursor position in pixels relative to the progress bar element
    var relX = event.pageX - (rect.left + document.body.scrollLeft);

    // Returns mouse cursor position in percentage relative to the progress bar element
    var relXPercent = (relX / progress.offsetWidth) * 100;

    // Set video time relative to mouse cursor
    video.currentTime = (video.duration * relXPercent) / 100;

    play();
  }

  function updateProgressBuffered() {
    if (video.buffered.length > 0) {
      var bufferedEnd = video.buffered.end(video.buffered.length - 1);
      var duration = video.duration;
      var bufferedAmount = (bufferedEnd / duration) * 100;

      // Show buffered amount on the progress bar
      if (duration > 0) {
        progressLoaded.style.width = bufferedAmount + '%';

        // Set ARIA accessibility attributes
        progressLoaded.setAttribute('aria-valuenow', bufferedAmount);

      }
    }
  }

  function onProgressDragStart() {
    pause();
    scrubVideo();
    progress.addEventListener('mousemove', onProgressDragOver);
  }

  function onProgressDragOver() {
    scrubVideo();
  }

  function onProgressDragStop() {
    progress.removeEventListener('mousemove', onProgressDragOver);
  }

  function scrubVideo() {
    // Returns the size of an element and its position relative to the viewport
    var rect = progress.getBoundingClientRect();

    // Returns mouse cursor position in pixels relative to the progress bar element
    var relX = event.pageX - (rect.left + document.body.scrollLeft);

    // Returns mouse cursor position in percentage relative to the progress bar element
    var relXPercent = (relX / progress.offsetWidth) * 100;

    // Calculate video duration relative to mouse cursor using "hh:mm:ss" format
    var relTime = (video.duration * relXPercent) / 100;
    var relFormattedTime = secondsToHms((video.duration * relXPercent) / 100);

    // Set ARIA accessibility attributes
    progressPlayed.setAttribute('aria-valuenow', video.currentTime);

    // Returns current time in percentage
    var playedPercent = (relTime / video.duration) * 100;

    // Update played progress
    progressPlayed.style.width = playedPercent + '%';

    // Calculate current time using "hh:mm:ss" format

    // Update timestamp relative to played progress
    timeCode.style.left = playedPercent + '%';
    timeCodeText.innerHTML = relFormattedTime;
  }

  /**
   * Utilities
   */
  function secondsToHms(date) {
    date = Number(date);
    var h = Math.floor(date / 3600);
    var m = Math.floor(date % 3600 / 60);
    var s = Math.floor(date % 3600 % 60);
    return (h > 0 ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function debounce(fn, delay) {
    var timer = null;
    return function() {
      var context = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn.apply(context, args);
      }, delay);
    };
  }
})();

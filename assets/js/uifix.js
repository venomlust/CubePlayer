//UI fixes
$('#music-timeline').css('width', '100%');
$('#music-volume').css('width', '100%');

$('#library').height($(window).height() - $('#header').height());

$(window).resize(function() {
    $('#library').height($(window).height() - $('#header').height());

    if (Modernizr.mq('only screen and (max-width: 644px)')) {
        $('#basic-controls').removeClass('col-xs-4').addClass('col-xs-12');
        $('#realtime-info').removeClass('col-xs-8').addClass('col-xs-12');
        $('#music-volume').css('width', '50%');
    }
    if (Modernizr.mq('only screen and (min-width: 644px)')) {
        $('#basic-controls').removeClass('col-xs-12').addClass('col-xs-4');
        $('#realtime-info').removeClass('col-xs-12').addClass('col-xs-8');
        $('#music-volume').css('width', '100%');
    }
});

/* Fix drag n drop error */
$('#library').on('dragover', function(event) {
    event.stopPropagation();
    event.preventDefault();
});

$('#header').on('dragover', function(event) {
    event.stopPropagation();
    event.preventDefault();
});

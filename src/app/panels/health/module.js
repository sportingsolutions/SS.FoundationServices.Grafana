define([
  'angular',
  'app',
  'underscore',
  'jquery',
  'require',
  'kbn'
],

function (angular, app, _, $) {
  'use strict';

  var OK = {
    icon : "icon-ok-sign",
    iconColor : "#ADFF2F"
  };

  var WARNING = {
    icon : "icon-exclamation-sign",
    iconColor : "#FFA500"
  };

  var ERROR = {
    icon : "icon-remove-sign",
    iconColor : "#FF0000"
  };

  var module = angular.module('kibana.panels.health', []);
  app.useModule(module);

  module.controller('health', function($rootScope, $scope, datasourceSrv) {

    $scope.panelMeta = {
      description : "Shows a metric as a health icon. 0 - error, 0.5 - warning, 1 - good"
    };

    /* Initialization
      ================ */

    var _d = {
      nullPointMode : 'Connected',
      direction : "Asc",
      warningThreshold : 0.5,
      includeWarningThreshold : false,
      threshold : 1,
      expression : "",
    };

    _.defaults($scope.panel, _d);

    $scope.init = function() {
      $scope.initBaseController(this, $scope);
      $scope.panel.updates = [];
      $scope.getData();
    };

    /* Event Hooks
      ============= */

    $scope.$on('refresh', function() {
      if ($rootScope.fullscreen || $scope.panelMeta.loading) {
        return;
      }

      $scope.getData();
    });

    $scope.$on('render', function() {
      $scope.update();
    });

    angular.element(window).bind('resize', function() {
      $scope.update();
    });

    /* Functions
      =========== */

    $scope.update = function(updates) {

      if(!updates){
        updates = $scope.panel.updates;
      }

      $scope.calculateHeight(updates.length);
      $scope.panel.updates = updates;
      $('div').tooltip('hide');

      if(!$scope.$$phase && !$scope.$root.$$phase){
        
        $scope.$apply(); 
      }
    };

    $scope.panel.getUpdateStyle = function(update) {
      return {
        'color': update.type.iconColor,
        'fontSize': $scope.panel.calculatedFontSize, 
      };
    }

    $scope.calculateHeight = function(updateCount) {
      try {

        var height = $scope.height || $scope.panel.height || $scope.row.height;
        var windowWidth = $(window).width();
        var singleSpanWidth = Math.ceil(windowWidth * (1 / 12));
        var fontSize = singleSpanWidth - 10;

        if (_.isString(height)) {
          height = parseInt(height.replace('px', ''), 10);
        }

        $scope.panel.calculatedHeight = (height - 32) + 'px';
        $scope.panel.calculatedFontSize = fontSize + 'px';

      } catch(e) {
        // IE throws errors sometimes
      }
    };

    $scope.getData = function() {

      delete $scope.panel.error;
      $scope.panelMeta.loading = true;

      var graphiteQuery = {
        range: this.filter.timeRange(false),
        targets: [{ target: $scope.panel.expression }],
        format: 'json',
        maxDataPoints: Math.ceil($(window).width() * ($scope.panel.span / 12)),
        datasource: 'graphite',
      };

      $scope.datasource = datasourceSrv.get();

      return $scope.datasource.query($scope.filter, graphiteQuery)
        .then($scope.dataHandler)
        .then(null, function(err) {
          $scope.panelMeta.loading = false;
          $scope.panel.error = err.message || "Health data request error";
          $scope.inspector.error = err;
        });
    };

    $scope.dataHandler = function(results) {

      if(results.data){

        var updates = [];

        for (var i = 0; i < results.data.length; i++) {

          var data = results.data[i];

          if(data){

            var datapoints = data.datapoints;

            if(datapoints) {

              var rawVal;

              if(datapoints.length > 1){
                rawVal = datapoints[datapoints.length - 2][0];
              }else{
                rawVal = datapoints[0][0];
              }

              var newVal = rawVal !== null ? rawVal : $scope.panel.nullPointMode === 'Connected' ? $scope.panel.oldVal : 0;
              var type;

              if($scope.panel.direction === 'Asc')
              {
                  if(newVal >= $scope.panel.threshold){
                    type = ERROR;
                  } else if($scope.panel.includeWarningThreshold && newVal >= $scope.panel.warningThreshold){
                    type = WARNING;
                  } else {
                    type = OK;
                  }
              } else {
                  if(newVal >= $scope.panel.threshold){
                    type = OK;
                  } else if($scope.panel.includeWarningThreshold && newVal >= $scope.panel.warningThreshold){
                    type = WARNING;
                  } else {
                    type = ERROR;
                  }
              }

              var update = {
                text : data.target,
                type : type
              };

              updates.push(update);
            }
          }
        }

        $scope.update(updates);

      }

      $scope.panelMeta.loading = false;

    };

  });

});
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

  var HEALTHY = "icon-ok-sign";
  var WARNING = "icon-exclamation-sign";
  var ERROR = "icon-remove-sign";

  var module = angular.module('kibana.panels.health', []);
  app.useModule(module);

  module.controller('health', function($rootScope, $scope, datasourceSrv) {

    $scope.panelMeta = {
      description : "Shows a metric as a health icon."
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
      healthyColor : "#ADFF2F",
      errorColor : "#FF0000",
      warningColor : "#FFA500",
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

      $scope.calculate(updates.length);
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
        'padding': '2px',
      };
    };

    $scope.calculate = function(updateCount) {
      try {

        var height = $scope.height || $scope.panel.height || $scope.row.height;
        var windowWidth = $(window).width();

        if (_.isString(height)) {
          height = parseInt(height.replace('px', ''), 10);
        }

        var totalWidth =  Math.ceil(windowWidth * ($scope.panel.span / 12)) - 20; // For padding within panel
        var totalHeight = height - 32; // 32 for error bar
        var currentFontSize = 130; // 130px is the max size
        var availableOnRow = totalWidth;
        var availableOnHeight = totalHeight;

        while(true){

          var fontHeight = currentFontSize + 2 + 4; // 1px top and bottom margin from font + 2px padding top and bottom
          var fontWidth = fontHeight * 0.84 + 4; // 0.84 is ratio size of icons we're using + 2px padding left and right
          var canFit = 0;

          while(canFit <= updateCount) {
            availableOnRow -= fontWidth;
            if(availableOnRow < fontWidth){
              availableOnRow = totalWidth;
              availableOnHeight -= fontHeight;
              if(availableOnHeight < fontHeight){
                availableOnHeight = totalHeight;
                break;
              }
            }

            canFit++;
          }

          if(canFit >= updateCount){
            break;
          } else{
            currentFontSize--;
          }
        }

        $scope.panel.calculatedHeight = totalHeight + 'px';
        $scope.panel.calculatedFontSize = currentFontSize + 'px';

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
              var type = $scope.getType(newVal);

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

    $scope.getType = function(newVal) {

      var iconColor;
      var icon;

      if($scope.panel.direction === 'Asc')
      {
        if(newVal >= $scope.panel.threshold){
          icon = ERROR;
          iconColor = $scope.panel.errorColor;
        } else if($scope.panel.includeWarningThreshold && newVal >= $scope.panel.warningThreshold){
          icon = WARNING;
          iconColor = $scope.panel.warningColor;
        } else {
          icon = HEALTHY;
          iconColor = $scope.panel.healthyColor;
        }
      } else {
        if(newVal >= $scope.panel.threshold){
          icon = HEALTHY;
          iconColor = $scope.panel.healthyColor;
        } else if($scope.panel.includeWarningThreshold && newVal >= $scope.panel.warningThreshold){
          icon = WARNING;
          iconColor = $scope.panel.warningColor;
        } else {
          icon = ERROR;
          iconColor = $scope.panel.errorColor;
        }
      }

      return {
        icon: icon,
        iconColor: iconColor
      };

    };

  });

});
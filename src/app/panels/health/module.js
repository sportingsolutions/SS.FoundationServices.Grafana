define([
  'angular',
  'app',
  'underscore',
  'require',
  'kbn'
],

function (angular, app, _) {
  'use strict';

  var OK = {
    icon : "icon-ok-sign",
    iconColor : "#ADFF2F"
  };

  var WARNING = {
    icon : "icon-warning-sign",
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
      warningThreshold : 0.5,
      errorThreshold : 1,
      expression : "",
    };

    _.defaults($scope.panel, _d);

    $scope.init = function() {
      $scope.initBaseController(this, $scope);

      $scope.updateStyle(OK);

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
      $scope.updateStyle();
    });

    angular.element(window).bind('resize', function() {
      $scope.updateStyle();
    });

    /* Functions
      =========== */

    $scope.updateStyle = function(type) {

      if(!type){
        type = $scope.panel.currentType;
      }

      $scope.calculateHeight();
      $scope.panel.icon = type.icon;
      $scope.panel.currentStyle = function() {
        return {
          color : type.iconColor,
          fontSize : $scope.panel.calculatedIconHeight
        };
      };

      $scope.panel.currentType = type;
    };

    $scope.calculateHeight = function() {
      try {

        var height = $scope.height || $scope.panel.height || $scope.row.height;

        if (_.isString(height)) {
          height = parseInt(height.replace('px', ''), 10);
        }

        // 32 taken from grafanaGraph directive - setElementHeight()
        var calculatedHeight = height - 32;
        $scope.panel.calculatedHeight = calculatedHeight + 'px';
        $scope.panel.calculatedIconHeight = (calculatedHeight - 35) + 'px';

      } catch(e) {
        // IE throws errors sometimes
      }
    };

    $scope.getData = function() {

      delete $scope.panel.error;
      $scope.panelMeta.loading = true;

      var graphiteQuery = {
        range: this.filter.timeRange(false),
        interval: $scope.interval,
        targets: [{ target: $scope.panel.expression }],
        format: 'json',
        maxDataPoints: 1,
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

        var data = results.data[0];

        if(data){

          var datapoints = data.datapoints;

          if(datapoints) {

            // Ignore the last datapoint as it returns inconsistent values across api calls.
            // The issue appears to be with using from and until range values rather than explicit
            // unix dates. Being one datapoint out should make no difference in our case.

            var rawVal = datapoints[datapoints.length - 2][0];
            var newVal = rawVal !== null ? rawVal : $scope.panel.nullPointMode === 'Connected' ? $scope.panel.oldVal : 0;

            var type = OK;

            if(newVal >= $scope.panel.warningThreshold){
              type = newVal >= $scope.panel.errorThreshold ? ERROR : WARNING;
            }

            $scope.updateStyle(type);
          }
        }
      }

      $scope.panelMeta.loading = false;

    };

  });

});
define([
  'angular',
  'app',
  'underscore',
  'require',
  'kbn'
],

function (angular, app, _) {
  'use strict';

  var module = angular.module('kibana.panels.numeric', []);
  app.useModule(module);

  module.controller('numeric', function($rootScope, $scope, datasourceSrv) {

    $scope.panelMeta = {
      description : "Shows a metric as a numeric value, optionally with a delta"
    };

    /* Initialization
      ================ */

    var _d = {
      decimalPoints : 0,
      showDelta : false,
      deltaColor : "#FFA500",
      expression : "",
    };

    _.defaults($scope.panel, _d);

    $scope.init = function() {
      $scope.initBaseController(this, $scope);

      $scope.panel.val = 0;
      $scope.panel.delta = 0;
      $scope.panel.oldVal = 0;

      $scope.calculateHeight();
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
      $scope.calculateHeight();
    });

    angular.element(window).bind('resize', function() {
      $scope.calculateHeight();
    });

    /* Functions
      =========== */

    $scope.calculateHeight = function() {
      try {

        var height = $scope.height || $scope.panel.height || $scope.row.height;

        if (_.isString(height)) {
          height = parseInt(height.replace('px', ''), 10);
        }

        // 32 taken from grafanaGraph directive - setElementHeight()
        $scope.panel.calculatedHeight = (height - 32) + 'px';

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
          $scope.panel.error = err.message || "Numeric data request error";
          $scope.inspector.error = err;
        });
    };

    $scope.dataHandler = function(results) {

      var data = results.data[0];

      if(data !== undefined){

        var datapoints = data.datapoints;
        var rawVal = datapoints[datapoints.length - 1][0];
        var newVal = rawVal === null ? 0 : rawVal;

        if($scope.panel.oldVal !== newVal){

          var delta = newVal - $scope.panel.oldVal;

          var newValStr = newVal.toFixed($scope.panel.decimalPoints);
          var deltaRoundedStr = delta.toFixed($scope.panel.decimalPoints);
          var zeroRoundedStr = (0).toFixed($scope.panel.decimalPoints);
          var deltaStr = delta > 0 ? '+' + deltaRoundedStr : delta === 0 ? '+/- ' + zeroRoundedStr : deltaRoundedStr;

          $scope.panel.val = newValStr;
          $scope.panel.delta = deltaStr;
          $scope.panel.oldVal = newVal;
        }
      }

      $scope.panelMeta.loading = false;

    };

  });

});
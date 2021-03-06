define([
  'angular',
  'app',
  'lodash',
  'jquery',
  'require',
  'kbn'
],

function (angular, app, _, $) {
  'use strict';

  var module = angular.module('grafana.panels.numeric', []);
  app.useModule(module);

  module.controller('numeric', function($rootScope, $scope, panelSrv, datasourceSrv) {

    $scope.panelMeta = {
      description : "Shows a metric as a numeric value, optionally with a delta"
    };

    /* Initialization
      ================ */

    var _d = {
      nullPointMode : 'Connected',
      decimalPoints : 0,
      showDelta : false,
      deltaColor : "#FFA500",
      expression : "",
    };

    _.defaults($scope.panel, _d);

    $scope.init = function() {
      panelSrv.init(this);

      $scope.panel.val = "0";
      $scope.panel.delta = "+/- 0";
      $scope.panel.oldVal = "0";

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
          $scope.panel.error = err.message || "Numeric data request error";
          $scope.inspector.error = err;
        });
    };

    $scope.dataHandler = function(results) {

      if(results.data){

        var data = results.data[0];

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

            if($scope.panel.oldVal !== newVal){

              var delta = $scope.panel.oldVal ? newVal - $scope.panel.oldVal : 0;

              var newValStr = newVal.toFixed($scope.panel.decimalPoints);
              var deltaRoundedStr = delta.toFixed($scope.panel.decimalPoints);
              var zeroRoundedStr = (0).toFixed($scope.panel.decimalPoints);
              var deltaStr = delta > 0 ? '+' + deltaRoundedStr : delta === 0 ? '+/- ' + zeroRoundedStr : deltaRoundedStr;

              $scope.panel.val = newValStr;
              $scope.panel.delta = deltaStr;
              $scope.panel.oldVal = newVal;
            }
          }
        }
      }

      $scope.panelMeta.loading = false;

    };

    $scope.init();

  });

});
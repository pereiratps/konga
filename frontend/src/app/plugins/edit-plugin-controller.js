/**
 * This file contains all necessary Angular controller definitions for 'frontend.admin.login-history' module.
 *
 * Note that this file should only contain controllers and nothing else.
 */
(function() {
  'use strict';

  angular.module('frontend.plugins')
    .controller('EditPluginController', [
        '_','$scope','$rootScope','$log','MessageService','ConsumerModel','SocketHelperService',
        'KongPluginsService','$uibModalInstance','PluginsService','_plugin','_schema',
      function controller(_,$scope,$rootScope,$log,MessageService,ConsumerModel,SocketHelperService,
                          KongPluginsService,$uibModalInstance,PluginsService,_plugin,_schema ) {

          //var pluginOptions = new KongPluginsService().pluginOptions()
          var options = new KongPluginsService().pluginOptions(_plugin.name)

          $scope.plugin = _plugin
          $scope.schema = _schema.data
          $log.debug("Plugin",$scope.plugin)
          $log.debug("Schema",$scope.schema)
          //$log.debug("Options", options)
          $scope.close = close


          $scope.humanizeLabel = function(key) {
              return key.split("_").join(" ")
          }


          // Monkey patch to help with transition
          // of using plugin schema directly from kong
          $scope.data = _.merge(options.fields,$scope.schema,{
              consumer_id : $scope.plugin.consumer_id
          })
          $scope.description = $scope.data.meta ? $scope.data.meta.description : 'Configure the Plugin according to your specifications and add it to the API'

          function assignValues(fields,prefix) {
              Object.keys(fields).forEach(function (item) {

                  if(fields[item].schema) {
                      assignValues(fields[item].schema.fields,item)
                  }else{
                      var path = prefix ? prefix + "." + item : item;
                      var value = _.get(_plugin.config, path)

                      if (fields[item].type === 'array'
                          && value !== null && typeof value === 'object' && !Object.keys(value).length) {
                          value = []
                      }
                      fields[item].value = value
                      fields[item].help = _.get(options,path) ? _.get(options,path).help : ''
                  }
              })
          }

          assignValues($scope.data.fields);


          $scope.updatePlugin = function() {

              $scope.busy = true;


              var data = {
                  enabled : $scope.plugin.enabled,
              }

              if($scope.data.consumer_id instanceof Object) {
                  data.consumer_id = $scope.data.consumer_id.id
              }


              function createConfig(fields,prefix) {

                  Object.keys(fields).forEach(function (key) {
                      if(fields[key].schema) {
                          createConfig(fields[key].schema.fields,key)
                      }else{
                          var path = prefix ? prefix + "." + key : key;
                          if (fields[key].value instanceof Array) {
                              // Transform to comma separated string
                              data['config.' + path] = fields[key].value.join(",")
                          } else {
                              data['config.' + path] = fields[key].value
                          }
                      }


                  })

              }

              createConfig($scope.data.fields);

              console.log("adsasdasdasdasd",data)

              PluginsService.update(_plugin.id,data)
                  .then(function(res){
                      $log.debug("updatePlugin",res)
                      $scope.busy = false;
                      $rootScope.$broadcast('plugin.updated',res.data)
                      MessageService.success('"' + _plugin.name + '" plugin updated successfully!')
                      $uibModalInstance.dismiss()
                  }).catch(function(err){
                  $scope.busy = false;
                  $log.error("updatePlugin",err)
                  $scope.errors = err.data.customMessage || {}
              })
          }



          // Add the consumers to the plugin options
          $scope.getConsumer = function(val) {

              // Initialize filters
              $scope.filters = {
                  searchWord: val || '',
                  columns: ['username','custom_id']
              };

              var commonParameters = {
                  where: SocketHelperService.getWhere($scope.filters)
              };

              return ConsumerModel
                  .load(_.merge({}, commonParameters, {}))
                  .then(function(response){
                      return response.map(function(item){
                          return item;
                      });
                  });
          };

          function close() {
              $uibModalInstance.dismiss()
          }
      }
    ])
  ;
}());
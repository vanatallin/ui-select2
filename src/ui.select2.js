angular.module('ui.select2', []).value('uiSelect2Config', {}).directive('uiSelect2', ['uiSelect2Config', '$timeout',
  '$parse', function (uiSelect2Config, $timeout, $parse) {
    var options = {};
    if (uiSelect2Config) {
      angular.extend(options, uiSelect2Config);
    }
    return {
      require: 'ngModel',
      priority: 1,
      compile: function (tElm, tAttrs) {
        var watch,
            repeatOption,
            repeatAttr,
            isSelect = tElm.is('select'),
            isMultiple = angular.isDefined(tAttrs.multiple);

        // Enable watching of the options dataset if in use
        if (tElm.is('select')) {
          repeatOption = tElm.find( 'optgroup[ng-repeat], optgroup[data-ng-repeat], option[ng-repeat], option[data-ng-repeat]');

          if (repeatOption.length) {
            repeatAttr = repeatOption.attr('ng-repeat') || repeatOption.attr('data-ng-repeat');
            watch = jQuery.trim(repeatAttr.split('|')[0]).split(' ').pop();
          }
        }

        return function (scope, elm, attrs, controller) {
          // instance-specific options
          var opts = angular.extend({}, options, scope.$eval(attrs.uiSelect2));
          var onSelectCallback = $parse(attrs.onSelect);
          var items = [];
          var selected;

          function matchStart(term, text, object) {
            console.log('matchStart:', term, text, object);
            var found = false;
            var searchFields = opts.searchFields;
            var item = toJson(object.id);
            if (!item) {
              angular.forEach(items, function(value, index) {
                if (value.name === object.id) {
                  item = value;
                }
              });
            }
            if (searchFields && item) {
              angular.forEach(searchFields, function(searchField) {
                if (item[searchField] && item[searchField].toUpperCase().indexOf(term.toUpperCase()) >= 0) {
                  found = true;
                }
              });
            }
            return found || text.toUpperCase().indexOf(term.toUpperCase()) >= 0;
          }

          elm.select2.amd.require(['select2/compat/matcher'], function(oldMatcher) {
            $timeout(function() {
              opts.matcher = oldMatcher(matchStart);
              elm.select2(opts);
            });
          });

          function toJson(str) {
            var jsonStr;
            try {
              jsonStr = angular.fromJson(str);
            } catch (e) {
              //Do Nothing
            }
            return jsonStr;
          }

          /*
           Convert from Select2 view-model to Angular view-model.
           */
          var convertToAngularModel = function(select2_data) {
            console.log('convertToAngularModel:', select2_data);
            var model;
            if (opts.simple_tags) {
              model = [];
              angular.forEach(select2_data, function(value, index) {
                var idObject = toJson(value.id);
                model.push(idObject ? idObject : value.id);
              });
            } else {
              model = select2_data;
            }
            return model;
          };

          /*
           Convert from Angular view-model to Select2 view-model.
           */
          var convertToSelect2Model = function(angular_data) {
            console.log('convertToSelect2Model:', angular_data);
            var model = [];
            if (!angular_data) {
              return model;
            }
            var valueField = opts.valueField || 'id';
            var textField = opts.displayField || 'text';

            angular.forEach(angular_data, function(value, index) {
              model.push({'id': value[valueField], 'text': value[textField]});
            });

            return model;
          };

          if (isSelect) {
            // Use <select multiple> instead
            delete opts.multiple;
            delete opts.initSelection;
          } else if (isMultiple) {
            opts.multiple = true;
          }

          if (controller) {
            scope.$watch(tAttrs.loading, function(current, old) {
              var isLoading = (typeof current === 'boolean') ? current : (!current || current.length === 0);
              if (isLoading) {
                opts.containerCssClass = 'loading';
                elm.select2().prop("disabled", 'true');
              } else {
                opts.containerCssClass = '';
                if (angular.isObject(current)) {
                  opts.data = convertToSelect2Model(current);
                  items = current;
                }
                if(!attrs.disabled) {
                  elm.select2().prop("disabled", false);
                }
              }
              $timeout(function() {
                elm.select2(opts);
                controller.$render();
              });
            });

            // Watch the options dataset for changes
            if (watch) {
              scope.$watch(watch, function (newVal, oldVal, scope) {
                if (angular.equals(newVal, oldVal)) {
                  return;
                }
                items = newVal;
              });
            }

            // Update valid and dirty statuses
            controller.$parsers.push(function (value) {
              var div = elm.prev();
              div
                  .toggleClass('ng-invalid', !controller.$valid)
                  .toggleClass('ng-valid', controller.$valid)
                  .toggleClass('ng-invalid-required', !controller.$valid)
                  .toggleClass('ng-valid-required', controller.$valid)
                  .toggleClass('ng-dirty', controller.$dirty)
                  .toggleClass('ng-pristine', controller.$pristine);
              return value;
            });
            var selectedItems;
            // Workaround for https://github.com/select2/select2/issues/3106
            if (isMultiple) {
              elm.select2(opts).on('select2:unselect', function(e){
                var index = selectedItems.indexOf(e.params.data.id);
                if (index > -1) {
                  selectedItems.splice(index, 1);
                }
                console.log('select2-removing', items, selectedItems);
                var newItems = items;
                newItems.filter(function(newItem) {
                  return selectedItems.indexOf(newItem.name) > -1;
                });
                console.log('newItems:', newItems);
                opts.data = convertToSelect2Model(newItems);
                elm.select2(opts)
              });
              elm.select2(opts).on('select2:select', function(e){
                e.stopImmediatePropagation();
                if (e.params && e.params.data && e.params.data.element) {
                  $timeout(function() {
                    if (items.selected && angular.isString(items.selected)) {
                      selected = toJson(items.selected);
                    }
                    if (!selected) {
                      selected = items.selected;
                    }
                    selectedItems = selected;
                    var val = elm.select2(opts).val();
                    if (angular.isArray(val)) {
                      selectedItems = [];
                      angular.forEach(val, function(value, index) {
                        selectedItems.push(value);
                      });
                    }
                    console.log('selItems:', selectedItems);
                    onSelectCallback(scope, {$item: selectedItems});
                  });
                  var element = e.params.data.element;
                  $elm = angular.element(element);
                  $t = angular.element(this);
                  $t.append($elm);
                  $t.trigger('change.select2');
                }
              });
            }
          }

          elm.bind("$destroy", function() {
            elm.select2("destroy");
          });

          attrs.$observe('disabled', function (value) {
            elm.select2().prop("disabled", value);
          });

          if (attrs.ngMultiple) {
            scope.$watch(attrs.ngMultiple, function(newVal) {
              attrs.$set('multiple', !!newVal);
              elm.select2(opts);
            });
          }

          // Initialize the plugin late so that the injected DOM does not disrupt the template compiler
          $timeout(function () {
            // opts.initSelection = function(element, callback) {
            //   callback(element.data("initial"));
            // }
            // elm.select2(opts);
            //   // Set initial value - I'm not sure about this but it seems to need to be there
            //   elm.select2('data', controller.$modelValue);
            //   // important!
            //   controller.$render();
            //   // Not sure if I should just check for !isSelect OR if I should check for 'tags' key
            //   if (!opts.initSelection && !isSelect) {
            //     var isPristine = controller.$pristine;
            //     controller.$pristine = false;
            //     controller.$setViewValue(
            //         convertToAngularModel(elm.select2('data'))
            //     );
            //     if (isPristine) {
            //       controller.$setPristine();
            //     }
            //     elm.prev().toggleClass('ng-pristine', controller.$pristine);
            //   }
          });
        };
      }
    };
  }]);

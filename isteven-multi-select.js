/* Multi-Select
 * Current version: 1.0.11
 * Adapted from iSteven Multi Select (Original license below)
 * Adapted by Dale Penndorf & Jeremy Waller
 * 
 * Dependencies (included in NuGet Package):
 *   - isteven-multi-select.css
 *   - ui-scroll https://github.com/angular-ui/ui-scroll
 * --------------------------------------------------------------------------------------------------------------------------------------
 * Usage:
 *  Include the 'isteven-multi-select' module as a dependency for your primary application module.
 * 
 *  <div isteven-multi-select
 *       directive-id="element-id" (id for this select field. Required if you will be using multiple controls on one page.)
 *       selection-mode="single" ('single' OR 'multiple' for single or multi-select box)
 *       input-model="var" (scope variable containing your input data)
 *       output-model="managerName.selected" (scope variable to which selections will be bound)
 *       button-label="text" (property(ies) on your input model to display on the button)
 *       item-label="text" (property(ies) on your input model to display in the option list)
 *       helper-elements="all none filter" (see original documentation)
 *       tick-property="selected" (see original documentation)
 *       infinite-scroll="false" ('true' pushes your input model to the UI as the user scrolls OR 'false' to load all on initialization)
 *       scroll-buffer="10" (number of items to load at a time when using infinite scroll) TODO: Fix in a later version. Currently defaults to 10 regardless.
 *       max-height="250px" (height of the select drop-down element)
 *       no-options-text="text" (placeholder text for button where the input model is empty)
 *       tagging="false" (valid for multi-select only. Lists each selection as tags below the select field)
 *       is-element-disabled="true" ('true' OR 'false' disables entire element)
 *       control-update="{refresh: false}" (set refresh to true to refresh the entire control)
 *       button-update="{refresh: false}" (set refresh to true to refresh the button label and output content)
 *       isteven-tabindex="1" (number used for tab indexing to get to this control's dropdown)
 *       item-click-validator (function, when supplied, item click will invoke this method first to validate whether to proceed with the click event)
 *       >
 * </div>
 * 
 * See original documentation below for additional functionality as well as more detailed information on the original featureset.
 * --------------------------------------------------------------------------------------------------------------------------------------
 */



/* 
 * Angular JS Multi Select
 * Creates a dropdown-like button with checkboxes. 
 *
 * Project started on: Tue, 14 Jan 2014 - 5:18:02 PM
 * Current version: 4.0.0
 * 
 * Released under the MIT License
 * --------------------------------------------------------------------------------
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Ignatius Steven (https://github.com/isteven)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to deal 
 * in the Software without restriction, including without limitation the rights 
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 * copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions: 
 *
 * The above copyright notice and this permission notice shall be included in all 
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
 * SOFTWARE.
 * --------------------------------------------------------------------------------
 */

'use strict'

angular.module('isteven-multi-select', ['ng', 'ui.scroll', 'ui.scroll.jqlite'])

    .factory('myInfiniteDatasource', [
        '$log', '$timeout', '$rootScope', function () {
            var model = [];
            var bufferSize = 10;

            return {
                get: get,
                revision: revision,
                setModel: setModel,
                setBufferSize: setBufferSize
            };

            function setModel(data) {
                model = data;
            }

            function get(index, count, success) {
                var results = [];

                // Second call on initial load will pass in an index of -9 to determine if there
                // are any items to load above the first item. This index is dependent on the buffer size
                // which currently defaults to 10. If this changes in the future this index issue will need
                // to be addressed.
                // For now, we are hardcoding to deal with this case so that the select will open to the first
                // item in the list. (Otherwise, it opens to the second item and you have to scroll up to see the first.)
                if (model.length == 0 || index == -9) {
                    return success(results);
                }

                var offset = -1;
                // ensure we don't overrun the bounds of the data array
                index = index + offset;
                var start = Math.max(0, index);
                var end = Math.min(index + count, model.length);

                if (index < 0 && model.length > 0) {
                    for (var i = 0; i < count + index; i++) {
                        results.push(model[i]);
                    }
                    success(results);
                }
                else {
                    for (var i = start; i < end; i++) {
                        results.push(model[i]);
                    }
                    success(results);
                }


            }

            function revision() {
                return model;
            }

            function setBufferSize(size) {
                bufferSize = angular.isDefined(size) ? size : 10;
            }
        }
    ])

    .directive('compile', ['$compile', function ($compile) {
        return function (scope, element, attrs) {
            scope.$watch(
              function (scope) {
                  return scope.$eval(attrs.compile);
              },
              function (value) {
                  element.html(value);
                  $compile(element.contents())(scope);
              }
           )
        };
    }])

    .directive('istevenMultiSelect', ['$sce', '$timeout', '$templateCache', '$document', 'myInfiniteDatasource', '$location', '$anchorScroll',
function ($sce, $timeout, $templateCache, $document, myInfiniteDatasource, $location, $anchorScroll) {
    return {
        restrict:
            'AE',

        scope:
        {
            // models
            inputModel: '=',
            outputModel: '=',

            controlUpdate: '=',
            buttonUpdate: '=',
            istevenTabindex: '@',

            // settings based on attribute
            isDisabled: '=',
            isElementDisabled: '=',

            // callbacks
            onClear: '&',
            onClose: '&',
            onSearchChange: '&',
            itemClickValidator: '&',
            onItemClick: '&',
            onOpen: '&',
            onReset: '&',
            onSelectAll: '&',
            onSelectNone: '&',

            // i18n
            translation: '='
        },

        /* 
         * The rest are attributes. They don't need to be parsed / binded, so we can safely access them by value.
         * - buttonLabel, directiveId, helperElements, itemLabel, maxLabels, orientation, selectionMode, minSearchLength,
         *   tickProperty, disableProperty, groupProperty, searchProperty, maxHeight, outputProperties
         */

        templateUrl:
           'isteven-multi-select.htm',

        link: function ($scope, element, attrs) {

            $scope.backUp = [];
            $scope.varButtonLabel = '';
            $scope.spacingProperty = '';
            $scope.indexProperty = '';
            $scope.orientationH = false;
            $scope.orientationV = true;
            $scope.filteredModel = [];
            $scope.inputLabel = { labelFilter: '' };
            $scope.tabIndex = 0;
            $scope.lang = {};
            $scope.helperStatus = {
                all: true,
                none: true,
                reset: true,
                filter: true
            };

            var
                prevTabIndex = 0,
                helperItems = [],
                helperItemsLength = 0,
                checkBoxLayer = '',
                scrolled = false,
                selectedItems = [],
                formElements = [],
                vMinSearchLength = 0,
                clickedItem = null


            // v3.0.0
            // clear button clicked
            $scope.clearClicked = function (e) {
                $scope.inputLabel.labelFilter = '';
                $scope.updateFilter();
                $scope.select('clear', e);
            }

            // A little hack so that AngularJS ng-repeat can loop using start and end index like a normal loop
            // http://stackoverflow.com/questions/16824853/way-to-ng-repeat-defined-number-of-times-instead-of-repeating-over-array
            $scope.numberToArray = function (num) {
                return new Array(num);
            }

            // Call this function when user type on the filter field
            $scope.searchChanged = function () {
                if ($scope.inputLabel.labelFilter.length < vMinSearchLength && $scope.inputLabel.labelFilter.length > 0) {
                    return false;
                }
                $scope.updateFilter();
            }

            function getDescendantProp(obj, desc) {
                var arr = desc.split(".");
                while (arr.length && (obj = obj[arr.shift()]));
                return obj;
            }

            $scope.updateFilter = function () {
                // we check by looping from end of input-model
                $scope.filteredModel = [];
                var i = 0;

                if (typeof $scope.inputModel === 'undefined') {
                    return false;
                }

                for (i = $scope.inputModel.length - 1; i >= 0; i--) {

                    // if it's group end, we push it to filteredModel[];
                    if (typeof $scope.inputModel[i][attrs.groupProperty] !== 'undefined' && $scope.inputModel[i][attrs.groupProperty] === false) {
                        $scope.filteredModel.push($scope.inputModel[i]);
                    }

                    // if it's data 
                    var gotData = false;
                    if (typeof $scope.inputModel[i][attrs.groupProperty] === 'undefined') {

                        // If we set the search-key attribute, we use this loop. 
                        if (typeof attrs.searchProperty !== 'undefined' && attrs.searchProperty !== '') {

                            for (var key in $scope.inputModel[i]) {
                                if (
                                    typeof $scope.inputModel[i][key] !== 'boolean'
                                    && String($scope.inputModel[i][key]).toUpperCase().indexOf($scope.inputLabel.labelFilter.toUpperCase()) >= 0
                                    && attrs.searchProperty.indexOf(key) > -1
                                ) {
                                    gotData = true;
                                    break;
                                }
                            }
                        }
                            // if there's no search-key attribute, we use this one. Much better on performance.
                        else {
                            var searchKeys = attrs['itemLabel'].split(' ');
                            angular.forEach(searchKeys, function (searchKey) {
                                var value = getDescendantProp($scope.inputModel[i], searchKey);
                                if (value.toString().toUpperCase().indexOf($scope.inputLabel.labelFilter.toUpperCase()) >= 0) {
                                    gotData = true;
                                }
                            });
                        }

                        if (gotData === true) {
                            // push
                            $scope.filteredModel.push($scope.inputModel[i]);
                        }
                    }

                    // if it's group start
                    if (typeof $scope.inputModel[i][attrs.groupProperty] !== 'undefined' && $scope.inputModel[i][attrs.groupProperty] === true) {

                        if (typeof $scope.filteredModel[$scope.filteredModel.length - 1][attrs.groupProperty] !== 'undefined'
                                && $scope.filteredModel[$scope.filteredModel.length - 1][attrs.groupProperty] === false) {
                            $scope.filteredModel.pop();
                        }
                        else {
                            $scope.filteredModel.push($scope.inputModel[i]);
                        }
                    }
                }


                $scope.filteredModel.reverse();

                if ($scope.infiniteScroll == true) {
                    myInfiniteDatasource.setModel($scope.filteredModel);
                }

                $timeout(function () {

                    $scope.getFormElements();

                    // Callback: on filter change                      
                    if ($scope.inputLabel.labelFilter.length > vMinSearchLength) {

                        var filterObj = [];

                        angular.forEach($scope.filteredModel, function (value, key) {
                            if (typeof value !== 'undefined') {
                                if (typeof value[attrs.groupProperty] === 'undefined') {
                                    var tempObj = angular.copy(value);
                                    var index = filterObj.push(tempObj);
                                    delete filterObj[index - 1][$scope.indexProperty];
                                    delete filterObj[index - 1][$scope.spacingProperty];
                                }
                            }
                        });

                        $scope.onSearchChange({
                            data:
                            {
                                keyword: $scope.inputLabel.labelFilter,
                                result: filterObj
                            }
                        });
                    }
                }, 0);
            };

            // List all the input elements. We need this for our keyboard navigation.
            // This function will be called everytime the filter is updated. 
            // Depending on the size of filtered mode, might not good for performance, but oh well..
            $scope.getFormElements = function () {
                formElements = [];

                var
                    selectButtons = [],
                    inputField = [],
                    checkboxes = [],
                    clearButton = [];

                // If available, then get select all, select none, and reset buttons
                if ($scope.helperStatus.all || $scope.helperStatus.none || $scope.helperStatus.reset) {
                    selectButtons = angular.element('#' + $scope.directiveId + ' #helper-buttons').children();
                    // If available, then get the search box and the clear button
                    if ($scope.helperStatus.filter) {
                        // Get helper - search and clear button. 
                        inputField = angular.element(document.querySelector('#' + $scope.directiveId + ' #search-field'));
                        clearButton = angular.element(document.querySelector('#' + $scope.directiveId + ' #clear-button'));
                    }
                }
                else {
                    if ($scope.helperStatus.filter) {
                        // Get helper - search and clear button. 
                        inputField = angular.element(document.querySelector('#' + $scope.directiveId + ' #search-field'));
                        clearButton = angular.element(document.querySelector('#' + $scope.directiveId + ' #clear-button'));
                    }
                }

                // Get checkboxes
                checkboxes = $document.find('#' + $scope.directiveId + ' input.checkbox.focusable');

                // Push them into global array formElements[] 
                for (var i = 0; i < selectButtons.length ; i++) { formElements.push(selectButtons[i]); }
                for (var i = 0; i < inputField.length ; i++) { formElements.push(inputField[i]); }
                for (var i = 0; i < clearButton.length ; i++) { formElements.push(clearButton[i]); }
                for (var i = 0; i < checkboxes.length ; i++) { formElements.push(checkboxes[i]); }
            }

            // check if an item has attrs.groupProperty (be it true or false)
            $scope.isGroupMarker = function (item, type) {
                if (typeof item[attrs.groupProperty] !== 'undefined' && item[attrs.groupProperty] === type) return true;
                return false;
            }

            $scope.removeGroupEndMarker = function (item) {
                if (typeof item[attrs.groupProperty] !== 'undefined' && item[attrs.groupProperty] === false) return false;
                return true;
            }

            //the pre-sync method checks to see if the caller wants to cancel the click event before proceeding		
            $scope.preSyncItems = function (item, e, ng_repeat_index) {
                e.preventDefault();
                e.stopPropagation();
                $timeout(function () {
                    if ($scope.itemClickValidator() == false) {
                        if (typeof attrs.selectionMode !== 'undefined' && attrs.selectionMode.toUpperCase() === 'SINGLE') {
                            // on single selection mode, we then hide the checkbox layer		
                            $scope.toggleCheckboxes(e);
                        }
                    }
                    else {
                        $scope.syncItems(item, e, ng_repeat_index);
                    }
                }, 0);
            }


            // call this function when an item is clicked
            $scope.syncItems = function (item, e, ng_repeat_index) {

                e.preventDefault();
                e.stopPropagation();

                // if the directive is globaly disabled, do nothing
                if (typeof attrs.disableProperty !== 'undefined' && item[attrs.disableProperty] === true) {
                    return false;
                }

                // if item is disabled, do nothing
                if (typeof attrs.isDisabled !== 'undefined' && $scope.isDisabled === true) {
                    return false;
                }

                // if end group marker is clicked, do nothing
                if (typeof item[attrs.groupProperty] !== 'undefined' && item[attrs.groupProperty] === false) {
                    return false;
                }

                var index = $scope.filteredModel.indexOf(item);

                // if the start of group marker is clicked ( only for multiple selection! )
                // how it works:
                // - if, in a group, there are items which are not selected, then they all will be selected
                // - if, in a group, all items are selected, then they all will be de-selected                
                if (typeof item[attrs.groupProperty] !== 'undefined' && item[attrs.groupProperty] === true) {

                    // this is only for multiple selection, so if selection mode is single, do nothing
                    if (typeof attrs.selectionMode !== 'undefined' && attrs.selectionMode.toUpperCase() === 'SINGLE') {
                        return false;
                    }

                    var i, j, k;
                    var startIndex = 0;
                    var endIndex = $scope.filteredModel.length - 1;
                    var tempArr = [];

                    // nest level is to mark the depth of the group.
                    // when you get into a group (start group marker), nestLevel++
                    // when you exit a group (end group marker), nextLevel--
                    var nestLevel = 0;

                    // we loop throughout the filtered model (not whole model)
                    for (i = index ; i < $scope.filteredModel.length ; i++) {

                        // this break will be executed when we're done processing each group
                        if (nestLevel === 0 && i > index) {
                            break;
                        }

                        if (typeof $scope.filteredModel[i][attrs.groupProperty] !== 'undefined' && $scope.filteredModel[i][attrs.groupProperty] === true) {

                            // To cater multi level grouping
                            if (tempArr.length === 0) {
                                startIndex = i + 1;
                            }
                            nestLevel = nestLevel + 1;
                        }

                            // if group end
                        else if (typeof $scope.filteredModel[i][attrs.groupProperty] !== 'undefined' && $scope.filteredModel[i][attrs.groupProperty] === false) {

                            nestLevel = nestLevel - 1;

                            // cek if all are ticked or not                            
                            if (tempArr.length > 0 && nestLevel === 0) {

                                var allTicked = true;

                                endIndex = i;

                                for (j = 0; j < tempArr.length ; j++) {
                                    if (typeof tempArr[j][$scope.tickProperty] !== 'undefined' && tempArr[j][$scope.tickProperty] === false) {
                                        allTicked = false;
                                        break;
                                    }
                                }

                                if (allTicked === true) {
                                    for (j = startIndex; j <= endIndex ; j++) {
                                        if (typeof $scope.filteredModel[j][attrs.groupProperty] === 'undefined') {
                                            if (typeof attrs.disableProperty === 'undefined') {
                                                $scope.filteredModel[j][$scope.tickProperty] = false;
                                                // we refresh input model as well
                                                inputModelIndex = $scope.filteredModel[j][$scope.indexProperty];
                                                $scope.inputModel[inputModelIndex][$scope.tickProperty] = false;
                                            }
                                            else if ($scope.filteredModel[j][attrs.disableProperty] !== true) {
                                                $scope.filteredModel[j][$scope.tickProperty] = false;
                                                // we refresh input model as well
                                                inputModelIndex = $scope.filteredModel[j][$scope.indexProperty];
                                                $scope.inputModel[inputModelIndex][$scope.tickProperty] = false;
                                            }
                                        }
                                    }
                                }

                                else {
                                    for (j = startIndex; j <= endIndex ; j++) {
                                        if (typeof $scope.filteredModel[j][attrs.groupProperty] === 'undefined') {
                                            if (typeof attrs.disableProperty === 'undefined') {
                                                $scope.filteredModel[j][$scope.tickProperty] = true;
                                                // we refresh input model as well
                                                inputModelIndex = $scope.filteredModel[j][$scope.indexProperty];
                                                $scope.inputModel[inputModelIndex][$scope.tickProperty] = true;

                                            }
                                            else if ($scope.filteredModel[j][attrs.disableProperty] !== true) {
                                                $scope.filteredModel[j][$scope.tickProperty] = true;
                                                // we refresh input model as well
                                                inputModelIndex = $scope.filteredModel[j][$scope.indexProperty];
                                                $scope.inputModel[inputModelIndex][$scope.tickProperty] = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                            // if data
                        else {
                            tempArr.push($scope.filteredModel[i]);
                        }
                    }
                }

                    // if an item (not group marker) is clicked
                else {

                    // If it's single selection mode
                    if (typeof attrs.selectionMode !== 'undefined' && attrs.selectionMode.toUpperCase() === 'SINGLE') {

                        // first, set everything to false
                        for (i = 0 ; i < $scope.filteredModel.length ; i++) {
                            $scope.filteredModel[i][$scope.tickProperty] = false;
                        }
                        for (i = 0 ; i < $scope.inputModel.length ; i++) {
                            $scope.inputModel[i][$scope.tickProperty] = false;
                        }

                        // then set the clicked item to true
                        $scope.filteredModel[index][$scope.tickProperty] = true;
                    }

                        // Multiple
                    else {
                        $scope.filteredModel[index][$scope.tickProperty] = !$scope.filteredModel[index][$scope.tickProperty];
                    }

                    // we refresh input model as well
                    var inputModelIndex = $scope.filteredModel[index][$scope.indexProperty];
                    $scope.inputModel[inputModelIndex][$scope.tickProperty] = $scope.filteredModel[index][$scope.tickProperty];
                }

                // we execute the callback function here
                clickedItem = angular.copy(item);
                if (clickedItem !== null) {
                    $timeout(function () {
                        delete clickedItem[$scope.indexProperty];
                        delete clickedItem[$scope.spacingProperty];
                        $scope.onItemClick({ data: clickedItem });
                        clickedItem = null;
                    }, 0);
                }

                $scope.refreshOutputModel();
                $scope.refreshButton();

                // We update the index here
                prevTabIndex = $scope.tabIndex;
                $scope.tabIndex = ng_repeat_index + helperItemsLength;

                // Set focus on the hidden checkbox 
                e.target.focus();

                // set & remove CSS style
                $scope.removeFocusStyle(prevTabIndex);
                $scope.setFocusStyle($scope.tabIndex);

                if (typeof attrs.selectionMode !== 'undefined' && attrs.selectionMode.toUpperCase() === 'SINGLE') {
                    // on single selection mode, we then hide the checkbox layer
                    $scope.toggleCheckboxes(e);
                }
            }

            // update $scope.outputModel
            $scope.refreshOutputModel = function () {

                $scope.outputModel = [];
                var
                    outputProps = [],
                    tempObj = {};

                // v4.0.0
                if (typeof attrs.outputProperties !== 'undefined') {
                    outputProps = attrs.outputProperties.split(' ');
                    angular.forEach($scope.inputModel, function (value, key) {
                        if (
                            typeof value !== 'undefined'
                            && typeof value[attrs.groupProperty] === 'undefined'
                            && value[$scope.tickProperty] === true
                        ) {
                            tempObj = {};
                            angular.forEach(value, function (value1, key1) {
                                if (outputProps.indexOf(key1) > -1) {
                                    tempObj[key1] = value1;
                                }
                            });
                            var index = $scope.outputModel.push(tempObj);
                            delete $scope.outputModel[index - 1][$scope.indexProperty];
                            delete $scope.outputModel[index - 1][$scope.spacingProperty];
                        }
                    });
                }
                else {
                    angular.forEach($scope.inputModel, function (value, key) {
                        if (
                            typeof value !== 'undefined'
                            && typeof value[attrs.groupProperty] === 'undefined'
                            && value[$scope.tickProperty] === true
                        ) {
                            var temp = angular.copy(value);
                            var index = $scope.outputModel.push(temp);
                            delete $scope.outputModel[index - 1][$scope.indexProperty];
                            delete $scope.outputModel[index - 1][$scope.spacingProperty];
                        }
                    });
                }
            }

            // refresh button label
            $scope.refreshButton = function () {

                $scope.varButtonLabel = '';
                var ctr = 0;

                // refresh button label...
                if ($scope.inputModel.length === 0) {
                    $scope.varButtonLabel = '<span style="float:left; color:lightgray; margin-left:6px;">' + $scope.noOptionsText + '</span>'

                }
                if ($scope.inputModel.length > 0 && $scope.outputModel.length === 0 && !$scope.tagging) {
                    // https://github.com/isteven/angular-multi-select/pull/19
                    $scope.varButtonLabel = '<span style="float:left; margin-left:6px;">' + $scope.lang.nothingSelected + '</span>'

                }
                else {
                    var tempMaxLabels = $scope.outputModel.length;
                    if (typeof attrs.maxLabels !== 'undefined' && attrs.maxLabels !== '') {
                        tempMaxLabels = attrs.maxLabels;
                    }

                    // if max amount of labels displayed..
                    if ($scope.outputModel.length > tempMaxLabels) {
                        $scope.more = true;
                    }
                    else {
                        $scope.more = false;
                    }

                    if ($scope.tagging) {
                        angular.forEach($scope.inputModel, function (value, key) {
                            if (typeof value !== 'undefined' && value[attrs.tickProperty] === true) {
                                if (ctr < tempMaxLabels) {
                                    $scope.varButtonLabel += ($scope.varButtonLabel.length > 0 ? '</div> <div class="buttonLabel">' : '<div class="buttonLabel">') + '<span class="tag-text">' +
                                        ($scope.varButtonLabel.length > 0 ? $scope.writeLabel(value, 'buttonLabel') : $scope.writeLabel(value, 'buttonLabel')) + '</span>' +
                                        '<span class="remove-button" ng-click="removeTag(' + value.istevenSelectTagID + ')" id="remove-' + value.istevenSelectTagID + '">x</span>';
                                }
                                ctr++;
                            }
                        });

                    } else {
                        angular.forEach($scope.inputModel, function (value, key) {
                            if (typeof value !== 'undefined' && value[attrs.tickProperty] === true) {
                                if (ctr < tempMaxLabels - 1) {
                                    $scope.varButtonLabel += ($scope.varButtonLabel.length > 0 ? '</div> <div class="buttonLabel">' : '<div class="buttonLabel">') + '<span >' +
                                        ($scope.varButtonLabel.length > 0 ? $scope.writeLabel(value, 'buttonLabel') : $scope.writeLabel(value, 'buttonLabel')) + ',&nbsp' + '</span>';
                                }
                                // Don't add a comma after the last element in the list.
                                if (ctr + 1 == tempMaxLabels) {
                                    $scope.varButtonLabel += ($scope.varButtonLabel.length > 0 ? '</div> <div class="buttonLabel">' : '<div class="buttonLabel">') + '<span >' +
                                        ($scope.varButtonLabel.length > 0 ? $scope.writeLabel(value, 'buttonLabel') : $scope.writeLabel(value, 'buttonLabel')) + '</span>';
                                }
                                ctr++;
                            }
                        });
                    }

                    if ($scope.more === true) {
                        // https://github.com/isteven/angular-multi-select/pull/16
                        if (tempMaxLabels > 0) {
                            $scope.varButtonLabel += '<span style="float:left">... ';
                        }
                        $scope.varButtonLabel += '(' + $scope.outputModel.length + ') </span>';
                    }
                }

                if ($scope.tagging == false) {
                    $scope.varButtonLabel = $scope.varButtonLabel + '<span class="caret"></span>';
                }
            }

            // Check if a checkbox is disabled or enabled. It will check the granular control (disableProperty) and global control (isDisabled)
            // Take note that the granular control has higher priority.
            $scope.itemIsDisabled = function (item) {

                if (angular.isUndefined(item) || angular.isUndefined(item[attrs.disableProperty])) {
                    return false;
                } else if (angular.isDefined(attrs.disableProperty) && item[attrs.disableProperty] === true) {
                    return true;
                }
                else {
                    if ($scope.isDisabled === true) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }

            }

            // A simple function to parse the item label settings. Used on the buttons and checkbox labels.
            $scope.writeLabel = function (item, type) {

                // type is either 'itemLabel' or 'buttonLabel'
                var temp = attrs[type].split(' ');
                var label = '';

                angular.forEach(temp, function (value, key) {
                    var propValue = getDescendantProp(item, value);

                    if (propValue) {
                        if (type.toUpperCase() === 'ITEMLABEL') {
                            var r = RegExp('(' + $scope.inputLabel.labelFilter + ')', 'gi');

                            if (r.source != "()") {
                                propValue = propValue.toString().replace(r, '<span class="filterResult">$1</span>');
                            }
                        }

                        label += propValue;
                    }
                });

                if (type.toUpperCase() === 'BUTTONLABEL') {
                    return label;
                }
                return $sce.trustAsHtml(label);
            }

            $scope.removeTag = function (e) {
                angular.forEach($scope.filteredModel, function (value, key) {
                    if (value.istevenSelectTagID == e) {
                        value[$scope.tickProperty] = false;
                        $scope.onItemClick({ data: value });
                    }
                })

                $scope.refreshButton();
            }

            // UI operations to show/hide checkboxes based on click event..
            $scope.toggleCheckboxes = function (e) {

                // We grab the button
                var clickedEl = element.children()[0];

                // Just to make sure.. had a bug where key events were recorded twice
                angular.element(document).off('click', $scope.externalClickListener);
                angular.element(document).off('keydown', $scope.keyboardListener);

                // The idea below was taken from another multi-select directive - https://github.com/amitava82/angular-multiselect 
                // His version is awesome if you need a more simple multi-select approach.                                

                // close
                if (angular.element(checkBoxLayer.selector).hasClass('show')) {

                    angular.element(checkBoxLayer.selector).removeClass('show');
                    angular.element(clickedEl).removeClass('buttonClicked');
                    angular.element(document).off('click', $scope.externalClickListener);
                    angular.element(document).off('keydown', $scope.keyboardListener);

                    // clear the focused element;
                    $scope.removeFocusStyle($scope.tabIndex);
                    if (typeof formElements[$scope.tabIndex] !== 'undefined') {
                        formElements[$scope.tabIndex].blur();
                    }

                    // close callback
                    $timeout(function () {
                        $scope.onClose();
                    }, 0);

                    // set focus on button again
                    element.children().children()[0].focus();
                }
                    // open
                else {
                    // clear filter
                    $scope.inputLabel.labelFilter = '';
                    $scope.updateFilter();

                    helperItems = [];
                    helperItemsLength = 0;

                    angular.element(checkBoxLayer.selector).addClass('show');
                    angular.element(clickedEl).addClass('buttonClicked');


                    // Attach change event listener on the input filter. 
                    // We need this because ng-change is apparently not an event listener.                    
                    angular.element(document).on('click', $scope.externalClickListener);
                    angular.element(document).on('keydown', $scope.keyboardListener);

                    // to get the initial tab index, depending on how many helper elements we have. 
                    // priority is to always focus it on the input filter                                                                
                    $scope.getFormElements();
                    $scope.tabIndex = 0;

                    var helperContainer = angular.element(element[0].querySelector('.helperContainer'))[0];

                    if (typeof helperContainer !== 'undefined') {
                        for (var i = 0; i < helperContainer.getElementsByTagName('BUTTON').length ; i++) {
                            helperItems[i] = helperContainer.getElementsByTagName('BUTTON')[i];
                        }
                        helperItemsLength = helperItems.length + helperContainer.getElementsByTagName('INPUT').length;
                    }

                    // focus on the filter element on open. 
                    if (element[0].querySelector('.inputFilter')) {
                        element[0].querySelector('.inputFilter').focus();
                        $scope.tabIndex = $scope.tabIndex + helperItemsLength - 2;
                        // blur button in vain
                        angular.element(element).children()[0].blur();
                    }
                        // if there's no filter then just focus on the first checkbox item
                    else {
                        if (!$scope.isDisabled) {
                            $scope.tabIndex = $scope.tabIndex + helperItemsLength;
                            if ($scope.inputModel.length > 0) {
                                formElements[$scope.tabIndex].focus();
                                $scope.setFocusStyle($scope.tabIndex);
                                // blur button in vain
                                angular.element(element).children()[0].blur();
                            }
                        }
                    }

                    // open callback
                    $scope.onOpen();
                }
            }

            // handle clicks outside the button / multi select layer
            $scope.externalClickListener = function (e) {

                var targetsArr = element.find(e.target.tagName);
                for (var i = 0; i < targetsArr.length; i++) {
                    if (e.target == targetsArr[i]) {
                        return;
                    }
                }

                angular.element(checkBoxLayer.previousSibling).removeClass('buttonClicked');
                angular.element(checkBoxLayer.selector).removeClass('show');
                angular.element(document).off('click', $scope.externalClickListener);
                angular.element(document).off('keydown', $scope.keyboardListener);

                // close callback                
                $timeout(function () {
                    $scope.onClose();
                }, 0);

                // set focus on button again
                element.children().children()[0].focus();
            }

            // select All / select None / reset buttons
            $scope.select = function (type, e) {

                var helperIndex = helperItems.indexOf(e.target);
                $scope.tabIndex = helperIndex;

                switch (type.toUpperCase()) {
                    case 'ALL':
                        angular.forEach($scope.inputModel, function (value, key) {
                            if (typeof value !== 'undefined' && value[attrs.disableProperty] !== true) {
                                if (typeof value[attrs.groupProperty] === 'undefined') {
                                    value[$scope.tickProperty] = true;
                                }
                            }
                        });
                        $scope.refreshOutputModel();
                        $scope.refreshButton();
                        $scope.onSelectAll();
                        break;
                    case 'NONE':
                        angular.forEach($scope.inputModel, function (value, key) {
                            if (typeof value !== 'undefined' && value[attrs.disableProperty] !== true) {
                                if (typeof value[attrs.groupProperty] === 'undefined') {
                                    value[$scope.tickProperty] = false;
                                }
                            }
                        });
                        $scope.refreshOutputModel();
                        $scope.refreshButton();
                        $scope.onSelectNone();
                        break;
                    case 'RESET':
                        angular.forEach($scope.inputModel, function (value, key) {
                            if (typeof value[attrs.groupProperty] === 'undefined' && typeof value !== 'undefined' && value[attrs.disableProperty] !== true) {
                                var temp = value[$scope.indexProperty];
                                if (value[$scope.tickProperty]) {
                                    value[$scope.tickProperty] = $scope.backUp[temp][$scope.tickProperty];
                                }
                            }
                        });
                        $scope.refreshOutputModel();
                        $scope.refreshButton();
                        $scope.onReset();
                        break;
                    case 'CLEAR':
                        $scope.tabIndex = $scope.tabIndex + 1;
                        $scope.onClear();
                        break;
                    case 'FILTER':
                        $scope.tabIndex = helperItems.length - 1;
                        break;
                    default:
                }
            }

            // just to create a random variable name                
            function genRandomString(length) {
                var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
                var temp = '';
                for (var i = 0; i < length; i++) {
                    temp += possible.charAt(Math.floor(Math.random() * possible.length));
                }
                return temp;
            }

            // count leading spaces
            $scope.prepareGrouping = function () {
                var spacing = 0;
                angular.forEach($scope.filteredModel, function (value, key) {
                    value[$scope.spacingProperty] = spacing;
                    if (value[attrs.groupProperty] === true) {
                        spacing += 2;
                    }
                    else if (value[attrs.groupProperty] === false) {
                        spacing -= 2;
                    }
                });
            }

            // prepare original index
            $scope.prepareIndex = function () {
                angular.forEach($scope.filteredModel, function (value, key) {
                    value[$scope.indexProperty] = key;
                });
            }

            // navigate using up and down arrow
            $scope.keyboardListener = function (e) {

                var key = e.keyCode ? e.keyCode : e.which;
                var isNavigationKey = false;

                // ESC key (close)
                if (key === 27) {
                    e.preventDefault();
                    e.stopPropagation();
                    $scope.toggleCheckboxes(e);
                }


                    // next element ( tab, down & right key )                    
                else if (key === 40 || key === 39 || (!e.shiftKey && key == 9)) {

                    isNavigationKey = true;
                    prevTabIndex = $scope.tabIndex;
                    $scope.tabIndex++;
                    if ($scope.tabIndex > formElements.length - 1) {
                        $scope.tabIndex = 0;
                        prevTabIndex = formElements.length - 1;
                    }
                    while (formElements[$scope.tabIndex].disabled === true) {
                        $scope.tabIndex++;
                        if ($scope.tabIndex > formElements.length - 1) {
                            $scope.tabIndex = 0;
                        }
                        if ($scope.tabIndex === prevTabIndex) {
                            break;
                        }
                    }
                }

                    // prev element ( shift+tab, up & left key )
                else if (key === 38 || key === 37 || (e.shiftKey && key == 9)) {
                    isNavigationKey = true;
                    prevTabIndex = $scope.tabIndex;
                    $scope.tabIndex--;
                    if ($scope.tabIndex < 0) {
                        $scope.tabIndex = formElements.length - 1;
                        prevTabIndex = 0;
                    }
                    while (formElements[$scope.tabIndex].disabled === true) {
                        $scope.tabIndex--;
                        if ($scope.tabIndex === prevTabIndex) {
                            break;
                        }
                        if ($scope.tabIndex < 0) {
                            $scope.tabIndex = formElements.length - 1;
                        }
                    }
                }

                if (isNavigationKey === true) {

                    e.preventDefault();

                    // set focus on the checkbox                    
                    formElements[$scope.tabIndex].focus();
                    var actEl = document.activeElement;

                    if (actEl.type.toUpperCase() === 'CHECKBOX') {
                        $scope.setFocusStyle($scope.tabIndex);
                        $scope.removeFocusStyle(prevTabIndex);
                    }
                    else {
                        $scope.removeFocusStyle(prevTabIndex);
                        $scope.removeFocusStyle(helperItemsLength);
                        $scope.removeFocusStyle(formElements.length - 1);
                    }
                }

                isNavigationKey = false;
            }

            // set (add) CSS style on selected row
            $scope.setFocusStyle = function (tabIndex) {
                angular.element(formElements[tabIndex]).parent().parent().parent().addClass('multiSelectFocus');
            }

            // remove CSS style on selected row
            $scope.removeFocusStyle = function (tabIndex) {
                angular.element(formElements[tabIndex]).parent().parent().parent().removeClass('multiSelectFocus');
            }

            /*********************
             *********************             
             *
             * 1) Initializations
             *
             *********************
             *********************/

            // attrs to $scope - attrs-$scope - attrs - $scope
            // Copy some properties that will be used on the template. They need to be in the $scope.
            $scope.groupProperty = attrs.groupProperty;
            $scope.tickProperty = attrs.tickProperty;
            $scope.directiveId = attrs.directiveId === 'undefined' ? 'isteven-select' : attrs.directiveId;
            $scope.scrollBuffer = attrs.scrollBuffer;
            $scope.infiniteScroll = attrs.infiniteScroll === 'true';
            $scope.elementHeightCss = "height: 325px";
            $scope.tagging = attrs.tagging === 'true';
            $scope.placeholderText = attrs.placeholderText === undefined ? 'Select an option...' : attrs.placeholderText;
            $scope.noOptionsText = attrs.noOptionsText === undefined ? 'No options available' : attrs.noOptionsText;

            // Unfortunately I need to add these grouping properties into the input model
            var tempStr = genRandomString(5);
            $scope.indexProperty = 'idx_' + tempStr;
            $scope.spacingProperty = 'spc_' + tempStr;

            // set orientation css            
            if (typeof attrs.orientation !== 'undefined') {

                if (attrs.orientation.toUpperCase() === 'HORIZONTAL') {
                    $scope.orientationH = true;
                    $scope.orientationV = false;
                }
                else {
                    $scope.orientationH = false;
                    $scope.orientationV = true;
                }
            }

            // get elements required for DOM operation
            checkBoxLayer = angular.element('#' + $scope.directiveId + ' #checkbox-layer');

            // set max-height property if provided
            if (typeof attrs.maxHeight !== 'undefined') {
                $scope.elementHeightCss = attrs.maxHeight;
            }

            // some flags for easier checking            
            for (var property in $scope.helperStatus) {
                if ($scope.helperStatus.hasOwnProperty(property)) {
                    if (
                        typeof attrs.helperElements !== 'undefined'
                        && attrs.helperElements.toUpperCase().indexOf(property.toUpperCase()) === -1
                    ) {
                        $scope.helperStatus[property] = false;
                    }
                }
            }
            if (typeof attrs.selectionMode !== 'undefined' && attrs.selectionMode.toUpperCase() === 'SINGLE') {
                $scope.helperStatus['all'] = false;
                //$scope.helperStatus[ 'none' ] = false;
            }

            // helper button icons.. I guess you can use html tag here if you want to. 
            $scope.icon = {};
            $scope.icon.selectAll = '&#10003;';    // a tick icon
            $scope.icon.selectNone = '&times;';     // x icon
            $scope.icon.reset = '&#8630;';     // undo icon            
            // this one is for the selected items
            $scope.icon.tickMark = '&#10003;';    // a tick icon 

            // configurable button labels                       
            if (typeof attrs.translation !== 'undefined') {
                $scope.lang.selectAll = $sce.trustAsHtml($scope.icon.selectAll + '&nbsp;&nbsp;' + $scope.translation.selectAll);
                $scope.lang.selectNone = $sce.trustAsHtml($scope.icon.selectNone + '&nbsp;&nbsp;' + $scope.translation.selectNone);
                $scope.lang.reset = $sce.trustAsHtml($scope.icon.reset + '&nbsp;&nbsp;' + $scope.translation.reset);
                $scope.lang.search = $scope.translation.search;
                $scope.lang.nothingSelected = $sce.trustAsHtml($scope.translation.nothingSelected);
                $scope.lang.previousPage = $scope.translation.previousPage;
                $scope.lang.nextPage = $scope.translation.nextPage;
            }
            else {
                $scope.lang.selectAll = $sce.trustAsHtml($scope.icon.selectAll + '&nbsp;&nbsp;Select All');
                $scope.lang.selectNone = $sce.trustAsHtml($scope.icon.selectNone + '&nbsp;&nbsp;Select None');
                $scope.lang.reset = $sce.trustAsHtml($scope.icon.reset + '&nbsp;&nbsp;Reset');
                $scope.lang.search = 'Search...';
                $scope.lang.nothingSelected = $scope.placeholderText;
                $scope.lang.previousPage = $sce.trustAsHtml('Previous Page');
                $scope.lang.nextPage = $sce.trustAsHtml('Next Page');
            }
            $scope.icon.tickMark = $sce.trustAsHtml($scope.icon.tickMark);

            // min length of keyword to trigger the filter function
            if (typeof attrs.MinSearchLength !== 'undefined' && parseInt(attrs.MinSearchLength) > 0) {
                vMinSearchLength = Math.floor(parseInt(attrs.MinSearchLength));
            }

            /*******************************************************
             *******************************************************
             *
             * 2) Logic starts here, initiated by watch 1 & watch 2
             *
             *******************************************************
             *******************************************************/

            function setTagIDs(inputModel) {
                angular.forEach(inputModel, function (item, key) {
                    item.istevenSelectTagID = key;
                });
            };

            function refreshControl() {
                setTagIDs($scope.inputModel);
                if ($scope.helperStatus.reset == true) {
                    $scope.backUp = angular.copy($scope.inputModel);
                }
                myInfiniteDatasource.setBufferSize($scope.scrollBuffer);
                $scope.updateFilter();
                $scope.prepareGrouping();
                $scope.prepareIndex();

                $scope.refreshOutputModel();
                $scope.refreshButton();
            }

            if ($scope.controlUpdate) {
                $scope.$watch('controlUpdate.refresh', function (newVal) {
                    if (newVal == true) {
                        refreshControl();
                        $scope.controlUpdate.refresh = false;
                    }
                });
            }

            if ($scope.buttonUpdate) {
                $scope.$watch('buttonUpdate.refresh', function (newVal) {
                    if (newVal == true) {
                        $scope.refreshOutputModel();
                        $scope.refreshButton();
                        $scope.buttonUpdate.refresh = false;
                    }
                });
            }

            //We need to watch the ui-scroll loading property so we know when to refresh the form elements.  
            //This allows us to tab/arrow through the new elements in the dropdown.
            if ($scope.infiniteScroll) {
                $scope.$watch(function () {
                    var localScope = angular.element('#' + $scope.directiveId + ' div.checkBoxContainer').scope();

                    if (localScope) {
                        return localScope.infiniteLoading;
                    }
                }, function (newVal) {
                    if (newVal == false) {
                        $scope.getFormElements();
                    }
                });
            }

            // watch2 for changes in input model as a whole
            // this on updates the multi-select when a user load a whole new input-model, or adds/removes items. We also update the $scope.backUp variable
            $scope.$watchCollection('inputModel', function (newVal) {
                if (newVal) {
                    refreshControl();
                }
            });

            // watch for changes in directive state (disabled or enabled)
            $scope.$watch('isDisabled', function (newVal) {
                $scope.isDisabled = newVal;
            });

            // this is for touch enabled devices. We don't want to hide checkboxes on scroll. 
            var onTouchStart = function (e) {
                $scope.$apply(function () {
                    $scope.scrolled = false;
                });
            };
            angular.element(document).bind('touchstart', onTouchStart);
            var onTouchMove = function (e) {
                $scope.$apply(function () {
                    $scope.scrolled = true;
                });
            };
            angular.element(document).bind('touchmove', onTouchMove);

            // unbind document events to prevent memory leaks
            $scope.$on('$destroy', function () {
                angular.element(document).unbind('touchstart', onTouchStart);
                angular.element(document).unbind('touchmove', onTouchMove);
            });
        }
    }
}]).run(['$templateCache', function ($templateCache) {
    var template =
        '<div ng-if="tagging" class="multiSelect inlineBlock tagging" id="{{directiveId}}">' +

            // main button
            '<button ng-disabled="isElementDisabled" class="button-container"' +
                'ng-click="$event.preventDefault(); $event.stopPropagation(); toggleCheckboxes( $event ); refreshButton(); prepareGrouping; prepareIndex();"' +
                'ng-disabled="disable-button" tabindex="{{istevenTabindex}}"' +
            '>' +
                '<span class="placeholder-text">{{placeholderText}}</span>' +
                '<span class="caret"></span>' +
            '</button>' +
            '<div id="tag-container" style="width:100%"' +
                'compile="varButtonLabel">' +
            '</div>' +

            // overlay layer
            '<div id="checkbox-layer" class="checkboxLayer">' +
                // container of the helper elements
                '<div class="helperContainer" ng-if="helperStatus.filter || helperStatus.all || helperStatus.none || helperStatus.reset ">' +
                    // container of the first 3 buttons, select all, none and reset
                    '<div id="helper-buttons" class="line" ng-if="helperStatus.all || helperStatus.none || helperStatus.reset ">' +
                        // select all
                        '<button type="button" class="helperButton" id="select-all-button"' +
                            'ng-disabled="isDisabled"' +
                            'ng-if="helperStatus.all"' +
                            'ng-click="select( \'all\', $event );"' +
                            'ng-bind-html="lang.selectAll">' +
                        '</button>' +
                        // select none
                        '<button type="button" class="helperButton" id="select-none-button"' +
                            'ng-disabled="isDisabled"' +
                            'ng-if="helperStatus.none"' +
                            'ng-click="select( \'none\', $event );"' +
                            'ng-bind-html="lang.selectNone">' +
                        '</button>' +
                        // reset
                        '<button type="button" class="helperButton reset" id="reset-button"' +
                            'ng-disabled="isDisabled"' +
                            'ng-if="helperStatus.reset"' +
                            'ng-click="select( \'reset\', $event );"' +
                            'ng-bind-html="lang.reset">' +
                        '</button>' +
                    '</div>' +

                    // the search box
                    '<div class="line" style="position:relative" ng-if="helperStatus.filter">' +
                        // textfield                
                        '<input placeholder="{{lang.search}}" type="text" id="search-field" autocomplete="off"' +
                            'ng-click="select( \'filter\', $event )" ' +
                            'ng-model="inputLabel.labelFilter" ' +
                            'ng-change="searchChanged()" class="inputFilter"' +
                            '/>' +
                        // clear button
                        '<button type="button" class="clearButton" id="clear-button" ng-click="clearClicked( $event )" >×</button> ' +
                    '</div> ' +
                '</div> ' +

                // Template for infinite scroll
                // selection items
                '<div ng-if="infiniteScroll" id="scroll-container">' +
                    '<div class="checkBoxContainer" ng-style="{\'height\': elementHeightCss}" ui-scroll-viewport>' +
                        '<div ' +
                            'ui-scroll="item in myInfiniteDatasource" buffer-size="" is-loading="infiniteLoading"' +
                            'class="multiSelectItem"' +
                            'ng-class="{selected: item[ tickProperty ], horizontal: orientationH, vertical: orientationV, multiSelectGroup:item[ groupProperty ], disabled:itemIsDisabled( item )}"' +
                            'ng-click="preSyncItems( item, $event, $index );" ' +
                            'ng-mouseleave="removeFocusStyle( tabIndex );"> ' +

                            // this is the spacing for grouped items
                            '<div class="acol" ng-if="item[ spacingProperty ] > 0" ng-repeat="i in numberToArray( item[ spacingProperty ] ) track by $index">' +
                            '</div>' +

                            '<div class="acol">' +
                                '<label>' +
                                    // input, so that it can accept focus on keyboard click
                                    '<input class="checkbox focusable" type="checkbox" ' +
                                        'ng-disabled="itemIsDisabled( item )" ' +
                                        'ng-checked="item[ tickProperty ]" ' +
                                        'ng-click="preSyncItems( item, $event, $index )" />' +
                                    // item label using ng-bind-hteml
                                    '<span ' +
                                        'ng-class="{disabled:itemIsDisabled( item )}" ' +
                                        'ng-bind-html="writeLabel( item, \'itemLabel\' )">' +
                                    '</span>' +
                                '</label>' +
                            '</div>' +

                            // the tick/check mark
                            '<span class="tickMark" ng-if="item[ groupProperty ] !== true && item[ tickProperty ] === true" ng-bind-html="icon.tickMark"></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                // Template for non-infinite scroll
                // selection items
                '<div ng-if="!infiniteScroll">' +
                    '<div class="checkBoxContainer" style="overflow-y: auto;" ng-style="{\'height\': elementHeightCss}">' +
                        '<div ' +
                            'ng-repeat="item in filteredModel | filter:removeGroupEndMarker" class="multiSelectItem"' +
                            'ng-class="{selected: item[ tickProperty ], horizontal: orientationH, vertical: orientationV, multiSelectGroup:item[ groupProperty ], disabled:itemIsDisabled( item )}"' +
                            'ng-click="preSyncItems( item, $event, $index );" ' +
                            'ng-mouseleave="removeFocusStyle( tabIndex );"> ' +

                            // this is the spacing for grouped items
                            '<div class="acol" ng-if="item[ spacingProperty ] > 0" ng-repeat="i in numberToArray( item[ spacingProperty ] ) track by $index">' +
                            '</div>' +

                            '<div class="acol">' +
                                '<label>' +
                                    // input, so that it can accept focus on keyboard click
                                    '<input class="checkbox focusable" type="checkbox" ' +
                                        'ng-disabled="itemIsDisabled( item )" ' +
                                        'ng-checked="item[ tickProperty ]" ' +
                                        'ng-click="preSyncItems( item, $event, $index )" />' +

                                    // item label using ng-bind-html
                                    '<span ' +
                                        'ng-class="{disabled:itemIsDisabled( item )}" ' +
                                        'ng-bind-html="writeLabel( item, \'itemLabel\' )">' +
                                    '</span>' +
                                '</label>' +
                            '</div>' +

                            // the tick/check mark
                            '<span class="tickMark" ng-if="item[ groupProperty ] !== true && item[ tickProperty ] === true" ng-bind-html="icon.tickMark"></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<div ng-if="!tagging" class="multiSelect inlineBlock" id="{{directiveId}}">' +
            // main button
            '<button ng-disabled="isElementDisabled" type="button" class="button-container"' +
                'ng-click="toggleCheckboxes( $event ); refreshButton(); prepareGrouping; prepareIndex();"' +
                'compile="varButtonLabel"' +
                'ng-disabled="disable-button" tabindex="{{istevenTabindex}}"' +
            '></button>' +

            // overlay layer
            '<div id="checkbox-layer" class="checkboxLayer">' +
                // container of the helper elements
                '<div class="helperContainer" ng-if="helperStatus.filter || helperStatus.all || helperStatus.none || helperStatus.reset ">' +
                    // container of the first 3 buttons, select all, none and reset
                    '<div id="helper-buttons" class="line" ng-if="helperStatus.all || helperStatus.none || helperStatus.reset ">' +
                        // select all
                        '<button type="button" class="helperButton" id="select-all-button"' +
                            'ng-disabled="isDisabled"' +
                            'ng-if="helperStatus.all"' +
                            'ng-click="select( \'all\', $event );"' +
                            'ng-bind-html="lang.selectAll">' +
                        '</button>' +
                        // select none
                        '<button type="button" class="helperButton" id="select-none-button"' +
                            'ng-disabled="isDisabled"' +
                            'ng-if="helperStatus.none"' +
                            'ng-click="select( \'none\', $event );"' +
                            'ng-bind-html="lang.selectNone">' +
                        '</button>' +
                        // reset
                        '<button type="button" class="helperButton reset" id="reset-button"' +
                            'ng-disabled="isDisabled"' +
                            'ng-if="helperStatus.reset"' +
                            'ng-click="select( \'reset\', $event );"' +
                            'ng-bind-html="lang.reset">' +
                        '</button>' +
                    '</div>' +

                    // the search box
                    '<div class="line" style="position:relative" ng-if="helperStatus.filter">' +
                        // textfield                
                        '<input placeholder="{{lang.search}}" type="text" id="search-field" autocomplete="off"' +
                            'ng-click="select( \'filter\', $event )" ' +
                            'ng-model="inputLabel.labelFilter" ' +
                            'ng-change="searchChanged()" class="inputFilter"' +
                        '/>' +

                        // clear button
                        '<button type="button" class="clearButton" id="clear-button" ng-click="clearClicked( $event )" >×</button> ' +
                    '</div> ' +
                '</div> ' +

                // Template for infinite scroll
                // selection items
                '<div ng-if="infiniteScroll" id="scroll-container">' +
                    '<div class="checkBoxContainer" ng-style="{\'height\': elementHeightCss}" ui-scroll-viewport>' +
                        '<div ' +
                            'ui-scroll="item in myInfiniteDatasource" buffer-size="" is-loading="infiniteLoading"' +
                            'class="multiSelectItem"' +
                            'ng-class="{selected: item[ tickProperty ], horizontal: orientationH, vertical: orientationV, multiSelectGroup:item[ groupProperty ], disabled:itemIsDisabled( item )}"' +
                            'ng-click="preSyncItems( item, $event, $index );" ' +
                            'ng-mouseleave="removeFocusStyle( tabIndex );"> ' +

                            // this is the spacing for grouped items
                            '<div class="acol" ng-if="item[ spacingProperty ] > 0" ng-repeat="i in numberToArray( item[ spacingProperty ] ) track by $index">' +
                            '</div>' +

                            '<div class="acol">' +
                                '<label>' +
                                    // input, so that it can accept focus on keyboard click
                                    '<input class="checkbox focusable" type="checkbox" ' +
                                        'ng-disabled="itemIsDisabled( item )" ' +
                                        'ng-checked="item[ tickProperty ]" ' +
                                        'ng-click="preSyncItems( item, $event, $index )" />' +
                                    // item label using ng-bind-hteml
                                    '<span ' +
                                        'ng-class="{disabled:itemIsDisabled( item )}" ' +
                                        'ng-bind-html="writeLabel( item, \'itemLabel\' )">' +
                                    '</span>' +
                                '</label>' +
                            '</div>' +

                            // the tick/check mark
                            '<span class="tickMark" ng-if="item[ groupProperty ] !== true && item[ tickProperty ] === true" ng-bind-html="icon.tickMark"></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                // Template for non-infinite scroll
                // selection items
                '<div ng-if="!infiniteScroll">' +
                    '<div class="checkBoxContainer" style="overflow-y: auto;" ng-style="{\'height\': elementHeightCss}">' +
                        '<div ' +
                            'ng-repeat="item in filteredModel | filter:removeGroupEndMarker" class="multiSelectItem"' +
                            'ng-class="{selected: item[ tickProperty ], horizontal: orientationH, vertical: orientationV, multiSelectGroup:item[ groupProperty ], disabled:itemIsDisabled( item )}"' +
                            'ng-click="preSyncItems( item, $event, $index );" ' +
                            'ng-mouseleave="removeFocusStyle( tabIndex );"> ' +

                            // this is the spacing for grouped items
                            '<div class="acol" ng-if="item[ spacingProperty ] > 0" ng-repeat="i in numberToArray( item[ spacingProperty ] ) track by $index">' +
                            '</div>' +

                            '<div class="acol">' +
                                '<label>' +
                                    // input, so that it can accept focus on keyboard click
                                    '<input class="checkbox focusable" type="checkbox" ' +
                                        'ng-disabled="itemIsDisabled( item )" ' +
                                        'ng-checked="item[ tickProperty ]" ' +
                                        'ng-click="preSyncItems( item, $event, $index )" />' +
                                    // item label using ng-bind-hteml
                                    '<span ' +
                                        'ng-class="{disabled:itemIsDisabled( item )}" ' +
                                        'ng-bind-html="writeLabel( item, \'itemLabel\' )">' +
                                    '</span>' +
                                '</label>' +
                            '</div>' +

                            // the tick/check mark
                            '<span class="tickMark" ng-if="item[ groupProperty ] !== true && item[ tickProperty ] === true" ng-bind-html="icon.tickMark"></span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    $templateCache.put('isteven-multi-select.htm', template);
}]);

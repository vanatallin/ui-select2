basePath = '..';

files = [
  JASMINE,
  JASMINE_ADAPTER,
  'components/jquery/jquery.js',
  'components/angular/angular.js',
  'components/*/*.js',
  'src/*.js',
  'test/*Spec.js'
];

// Avoid including minified version of angular and other libs again
exclude = [
  'components/*/*.min.js'
];

singleRun = true;

reporters = [
	'dots'
];
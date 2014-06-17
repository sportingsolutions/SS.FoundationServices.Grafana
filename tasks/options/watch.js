module.exports = function(config) {
  return {
    all: {
        files: ['**/*.js','**/*.html'],
        tasks: ['default'], 
        spawn: false
      }
  };
};
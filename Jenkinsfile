pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                echo 'Beginning build stage.'
                sh 'npm install'
                sh 'npm run clean'
                sh 'npm run build'
                echo 'Finished build stage.'
            }
        }
        stage('Deploy') {
            when {
                anyOf {
                    branch 'master'
                    branch pattern: 'release/*'
                    branch 'develop'
                }
            }
            steps {
                echo 'Beginning deploy stage.'
                script {
                    def packageJson = readJSON file: 'package.json'
                    def refAppVersion = packageJson.version
                    echo "Using branch '${BRANCH_NAME}', version ${refAppVersion}."
                    def basePath = "ctv.truex.com/web/ref-app/${BRANCH_NAME}"
                    def latestPath = "${basePath}/latest"
                    def versionPath = "${basePath}/${refAppVersion}"
                    def options = "--recursive --exclude \"*.js.map\" --acl public-read"
                    sh "aws s3 cp dist s3://${latestPath}/ ${options}"
                    sh "aws s3 cp dist s3://${versionPath}/ ${options}"
                    echo "Updated 'latest': https://${latestPath}/index.html"
                    echo "Updated '${refAppVersion}': https://${versionPath}/index.html"
                }
                echo 'Finished deploy stage.'
            }
        }
    }
    post {
        failure {
            emailext body: 'Check console output at $BUILD_URL to view the results. \n\n COMMITS: \n ${CHANGES}',
                    recipientProviders: [developers()],
                    subject: 'Jenkins Build Failed: $PROJECT_NAME - #$BUILD_NUMBER'
        }
    }
}

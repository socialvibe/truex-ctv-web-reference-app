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
                    branch 'feature/CTV-1937/host-ref-app'
                }
            }
            steps {
                echo 'Beginning deploy stage.'
                script {
                    echo "Using branch '${BRANCH_NAME}'."
                    def path = "ctv.truex.com/web/ref-app/${BRANCH_NAME}"
                    sh "aws s3 cp dist s3://${path}/ --recursive --exclude \"*.js.map\" --acl public-read"
                    echo "Updated: https://${path}/index.html"
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

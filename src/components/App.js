import React from 'react';
import Blocktube from '../abis/Blocktube.json'
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3';
import './App.css';

const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })

class App extends React.Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    } else {
      window.alert('Non-Ethereum browser detected. You should consider using MetaMask.')
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3
    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })
    const networkId = await web3.eth.net.getId()
    const networkData = Blocktube.networks[networkId]

    if (networkData) {
      const blocktube = new web3.eth.Contract(Blocktube.abi, networkData.address)
      this.setState({ blocktube })
      const videosCount = await blocktube.methods.videoCount().call()
      this.setState({ videosCount })

      for (var p=videosCount; p>=1; p--) {
        const video = await blocktube.methods.videos(p).call()
        this.setState({ videos: [...this.state.videos, video] })
      }

      const last = await blocktube.methods.videos(videosCount).call()
    
      this.setState({
        currentHash: last.hash,
        currentTitle: last.title,
        currentAuthor: last.author
      })
      this.setState({ loading: false})
    } else {
      window.alert('Blocktube contract not deployed to detected network.')
    }
  }

  captureFile = event => {
    event.preventDefault()
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log('buffer', this.state.buffer)
    }
  }


  uploadVideo = title => {
    console.log("Submitting file to IPFS...")

    ipfs.add(this.state.buffer, (error, result) => {
      console.log('IPFS result', result)
      if(error) {
        console.error(error)
        return
      }

      this.setState({ loading: true })
      this.state.blocktube.methods.uploadVideo(result[0].hash, title).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  changeVideo = (hash, title, author) => {
    this.setState({'currentHash': hash});
    this.setState({'currentTitle': title});
    this.setState({'currentAuthor': author})
  }

  constructor(props) {
    super(props)
    this.state = {
      buffer: null,
      account: '',
      blocktube: null,
      videos: [],
      loading: true,
      currentHash: null,
      currentTitle: null,
      currentAuthor: null
    }

    this.uploadVideo = this.uploadVideo.bind(this)
    this.captureFile = this.captureFile.bind(this)
    this.changeVideo = this.changeVideo.bind(this)
  }

  render() {
    return (
      <div>
        <Navbar 
          account={this.state.account}
        />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading... Pleaes note that videos can take up to 2 minutes to finish uploading.</p></div>
          : <Main
              videos={this.state.videos}
              uploadVideo={this.uploadVideo}
              captureFile={this.captureFile}
              changeVideo={this.changeVideo}
              currentHash={this.state.currentHash}
              currentTitle={this.state.currentTitle}
              currentAuthor={this.state.currentAuthor}
            />
        }
      </div>
    );
  }
}

export default App;